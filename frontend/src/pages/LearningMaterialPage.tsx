import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import {
  BookOpen,
  FileText,
  FileCode,
  Link as LinkIcon,
  Download,
  ExternalLink,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  Presentation,
  User,
  Calendar,
} from 'lucide-react';
import apiClient from '../services/api';
import { StudyMaterial, MaterialType } from '../types';

export const LearningMaterialPage: React.FC = () => {
  const { user } = useAuth();
  const isFaculty = user?.role === 'FACULTY' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadDescription, setUploadDescription] = useState<string>('');
  const [uploadType, setUploadType] = useState<MaterialType>('PDF');
  const [uploadSemester, setUploadSemester] = useState<number>(4);
  const [uploadExternalUrl, setUploadExternalUrl] = useState<string>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<StudyMaterial[]>('/learning/');
      setMaterials(res.data);
    } catch (err: any) {
      console.error('Failed to load study materials', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUploading(true);

      // Default subject and department fallback
      let subId = '';
      let deptId = '';
      const subRes = await apiClient.get('/academics/subjects').catch(() => ({ data: [] }));
      if (subRes.data.length > 0) {
        subId = subRes.data[0].id;
        deptId = subRes.data[0].department_id;
      }

      const formData = new FormData();
      formData.append('subject_id', subId);
      formData.append('department_id', deptId);
      formData.append('semester_number', String(uploadSemester));
      formData.append('title', uploadTitle);
      if (uploadDescription) formData.append('description', uploadDescription);
      formData.append('file_type', uploadType);

      if (uploadType === 'LINK') {
        if (!uploadExternalUrl) {
          setMessage({ text: 'Please provide external resource URL.', type: 'error' });
          setUploading(false);
          return;
        }
        formData.append('external_url', uploadExternalUrl);
      } else {
        if (uploadFile) {
          formData.append('file', uploadFile);
        }
      }

      await apiClient.post('/learning/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setMessage({ text: `Study resource "${uploadTitle}" shared successfully!`, type: 'success' });
      setUploadModalOpen(false);
      setUploadTitle('');
      setUploadDescription('');
      setUploadExternalUrl('');
      setUploadFile(null);
      loadMaterials();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.detail || 'Failed to upload material.', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (materialId: string, title: string) => {
    try {
      const res = await apiClient.get(`/learning/${materialId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setMessage({ text: 'Could not download resource file.', type: 'error' });
    }
  };

  const handleDelete = async (materialId: string) => {
    if (!window.confirm('Are you sure you want to remove this study resource?')) return;
    try {
      await apiClient.delete(`/learning/${materialId}`);
      setMessage({ text: 'Resource removed successfully.', type: 'success' });
      loadMaterials();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.detail || 'Failed to delete resource.', type: 'error' });
    }
  };

  const filteredMaterials = materials.filter((m) => {
    if (typeFilter !== 'ALL' && m.file_type !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchDesc = m.description?.toLowerCase().includes(q);
      const matchSub = m.subject_name?.toLowerCase().includes(q) || m.subject_code?.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchSub;
    }
    return true;
  });

  const getTypeIcon = (type: MaterialType) => {
    switch (type) {
      case 'PDF':
        return <FileText className="w-5 h-5 text-rose-400" />;
      case 'PPT':
        return <Presentation className="w-5 h-5 text-amber-400" />;
      case 'NOTES':
        return <FileCode className="w-5 h-5 text-purple-400" />;
      case 'LINK':
        return <LinkIcon className="w-5 h-5 text-blue-400" />;
    }
  };

  const getTypeBadge = (type: MaterialType) => {
    switch (type) {
      case 'PDF':
        return <Badge variant="rose">PDF Document</Badge>;
      case 'PPT':
        return <Badge variant="amber">Lecture Slides</Badge>;
      case 'NOTES':
        return <Badge variant="purple">Lecture Notes</Badge>;
      case 'LINK':
        return <Badge variant="cyan">Reference Web Link</Badge>;
    }
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Banner Alert */}
        {message && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between border ${
              message.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">Study Materials & Notes</h1>
              <Badge variant="cyan">Course LMS Repository</Badge>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Access lecture handbooks, presentations, revision notes, and syllabus reference material.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isFaculty && (
              <Button variant="primary" onClick={() => setUploadModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Upload Resource
              </Button>
            )}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <Card className="p-4 bg-[#111827]/80 border-[#1E293B]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Type Filter Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'ALL', label: 'All Files' },
                { id: 'PDF', label: 'PDF Documents' },
                { id: 'PPT', label: 'Presentations' },
                { id: 'NOTES', label: 'Class Notes' },
                { id: 'LINK', label: 'Web References' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setTypeFilter(btn.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                    typeFilter === btn.id
                      ? 'bg-cyan-950 border border-cyan-800 text-cyan-300'
                      : 'text-slate-400 hover:text-white hover:bg-[#0B0F19]'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="w-full md:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subject or topic..."
                className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </Card>

        {/* Materials Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20 text-cyan-400">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <Card className="p-12 text-center bg-[#111827]/60 border-[#1E293B]">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-base font-medium text-slate-300">No study materials found</p>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your filter or check back once faculty post new lecture resources.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMaterials.map((mat) => (
              <Card
                key={mat.id}
                className="p-5 bg-[#111827]/90 border-[#1E293B] hover:border-slate-700 transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/80 border border-cyan-800/80 text-cyan-300">
                        {mat.subject_code || 'CS301'}
                      </span>
                      <span className="text-xs text-slate-400">{mat.subject_name}</span>
                    </div>
                    {getTypeBadge(mat.file_type)}
                  </div>

                  <div className="flex items-start gap-3 pt-1">
                    <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] shrink-0 mt-0.5">
                      {getTypeIcon(mat.file_type)}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white leading-snug">{mat.title}</h3>
                      {mat.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{mat.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-2 border-t border-[#1E293B]/70">
                    <div className="flex items-center gap-1 truncate">
                      <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">{mat.faculty_name || 'Faculty'}</span>
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{new Date(mat.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between gap-2 border-t border-[#1E293B]/50 mt-3">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                    Sem {mat.semester_number}
                  </span>

                  <div className="flex items-center gap-2">
                    {mat.file_type === 'LINK' && mat.external_url ? (
                      <Button
                        variant="secondary"
                        onClick={() => window.open(mat.external_url, '_blank')}
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1" />
                        Open Link
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={() => handleDownload(mat.id, mat.title)}
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        Download
                      </Button>
                    )}

                    {isFaculty && (
                      <button
                        onClick={() => handleDelete(mat.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition"
                        title="Delete Resource"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* MODAL: Upload Resource (Faculty) */}
        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
                <h3 className="text-lg font-bold text-white">Share Course Material</h3>
                <button
                  onClick={() => setUploadModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E293B]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpload} className="space-y-4">
                <Input
                  label="Document Title *"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Unit 3: Graph Traversal & Dijkstra's Algorithm Notes"
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Resource Type *</label>
                    <select
                      value={uploadType}
                      onChange={(e) => setUploadType(e.target.value as MaterialType)}
                      className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="PDF">PDF Handbook / Notes</option>
                      <option value="PPT">Lecture Presentation (PPT)</option>
                      <option value="NOTES">Summary Notes Document</option>
                      <option value="LINK">External Documentation Link</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Semester</label>
                    <select
                      value={uploadSemester}
                      onChange={(e) => setUploadSemester(Number(e.target.value))}
                      className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-white"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <option key={s} value={s}>
                          Semester {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Summary / Key Topics</label>
                  <textarea
                    rows={2}
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="Briefly describe what this resource covers..."
                    className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {uploadType === 'LINK' ? (
                  <Input
                    label="Resource Web URL *"
                    type="url"
                    value={uploadExternalUrl}
                    onChange={(e) => setUploadExternalUrl(e.target.value)}
                    placeholder="https://docs.python.org or https://drive.google.com/..."
                    required
                  />
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Upload Document File
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cyan-950 file:text-cyan-300 hover:file:bg-cyan-900 cursor-pointer bg-[#0B0F19] border border-[#1E293B] rounded-xl p-2"
                    />
                    {uploadFile && (
                      <p className="text-[11px] text-emerald-400 mt-1">
                        File selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
                  <Button variant="secondary" type="button" onClick={() => setUploadModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={uploading || !uploadTitle}>
                    {uploading ? 'Uploading...' : 'Publish Resource'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};
