import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Sidebar from '../../components/layout/Sidebar';
import { complaintsApi } from '../../services/api';
import { useToast } from '../../components/ui/Toaster';
import { ALL_CATEGORIES, CATEGORY_LABELS } from '../../types';

const NAV_ITEMS = [
  { to: '/resident/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '/resident/complaints', icon: '📋', label: 'My Complaints' },
  { to: '/resident/complaints/new', icon: '➕', label: 'New Complaint' },
  { to: '/resident/notices', icon: '📢', label: 'Notices' },
];

export default function ResidentComplaintNew() {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (fd: FormData) => complaintsApi.createComplaint(fd),
    onSuccess: (complaint) => {
      qc.invalidateQueries({ queryKey: ['myComplaints'] });
      toast('Complaint submitted successfully!', 'success');
      navigate(`/resident/complaints/${complaint.id}`);
    },
    onError: (err: any) => toast(err.message || 'Failed to submit complaint', 'error'),
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!category) e.category = 'Please select a category';
    if (description.trim().length < 10) e.description = 'Description must be at least 10 characters';
    if (description.trim().length > 2000) e.description = 'Description too long (max 2000 characters)';
    if (photo) {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowed.includes(photo.type)) e.photo = 'Only JPEG, PNG, WebP, and GIF images allowed';
      if (photo.size > 5 * 1024 * 1024) e.photo = 'Image size must not exceed 5 MB';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const fd = new FormData();
    fd.append('category', category);
    fd.append('description', description.trim());
    if (photo) fd.append('photo', photo);
    mutation.mutate(fd);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
    setErrors(prev => ({ ...prev, photo: '' }));
  };

  return (
    <div className="app-layout">
      <Sidebar navItems={NAV_ITEMS} role="RESIDENT" />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">New Complaint</h1>
            <p className="page-subtitle">Describe your issue and we'll look into it</p>
          </div>
        </div>

        <div style={{ maxWidth: 640 }}>
          <div className="card">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="category">
                  Category <span className="required">*</span>
                </label>
                <select
                  id="category"
                  className="form-select"
                  value={category}
                  onChange={e => { setCategory(e.target.value); setErrors(p => ({ ...p, category: '' })); }}
                >
                  <option value="">Select a category...</option>
                  {ALL_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                  ))}
                </select>
                {errors.category && <div className="form-error">{errors.category}</div>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="description">
                  Description <span className="required">*</span>
                </label>
                <textarea
                  id="description"
                  className="form-textarea"
                  rows={5}
                  value={description}
                  onChange={e => { setDescription(e.target.value); setErrors(p => ({ ...p, description: '' })); }}
                  placeholder="Describe the issue in detail. Include location, time, and any relevant information..."
                />
                <div className="form-hint" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Minimum 10 characters</span>
                  <span style={{ color: description.length > 1900 ? 'var(--danger)' : 'var(--text-muted)' }}>
                    {description.length}/2000
                  </span>
                </div>
                {errors.description && <div className="form-error">{errors.description}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Photo (optional)</label>
                <div
                  className="file-upload-zone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileChange}
                  />
                  {photoPreview ? (
                    <div className="file-preview">
                      <img src={photoPreview} alt="Preview" />
                      <div>
                        <div style={{ fontWeight: 500 }}>{photo?.name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          {photo ? (photo.size / 1024 / 1024).toFixed(2) : 0} MB — Click to change
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="file-upload-icon">📷</div>
                      <div className="file-upload-text">
                        Click to upload a photo<br />
                        <span style={{ fontSize: '0.75rem' }}>JPEG, PNG, WebP, GIF · max 5 MB</span>
                      </div>
                    </>
                  )}
                </div>
                {errors.photo && <div className="form-error">{errors.photo}</div>}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate('/resident/complaints')}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending
                    ? <><span className="spinner spinner-sm" /> Submitting...</>
                    : '📤 Submit Complaint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
