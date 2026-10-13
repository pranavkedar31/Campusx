import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import apiClient from '../services/api';
import { Calendar, ArrowLeft, Download, CheckCircle, Eye, User, FileText, Pin } from 'lucide-react';

interface NoticeDetail {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: string;
  target_role: string;
  is_pinned: boolean;
  publish_date: string;
  expiry_date?: string;
  department_name?: string;
  course_name?: string;
  semester_number?: number;
  attachment_path?: string;
  attachment_name?: string;
  status: string;
  views_count: number;
  read_count: number;
  is_read: boolean;
  creator_name?: string;
}

export const NoticeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [notice, setNotice] = useState<NoticeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [readMarked, setReadMarked] = useState(false);

  useEffect(() => {
    fetchNotice();
  }, [id]);

  const fetchNotice = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<NoticeDetail>(`/notices/${id}`);
      setNotice(res.data);
      setReadMarked(res.data.is_read);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async () => {
    if (!id || readMarked) return;
    try {
      await apiClient.post(`/notices/${id}/read`);
      setReadMarked(true);
      if (notice) {
        setNotice({ ...notice, is_read: true, read_count: notice.read_count + 1 });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadAttachment = async () => {
    if (!id) return;
    try {
      const response = await apiClient.get(`/notices/${id}/attachment`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', notice?.attachment_name || `Notice_${id}_Attachment.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to download attachment.');
    }
  };

  if (loading) {
    return (
      <PageContainer title="Notice Bulletin" subtitle="Loading notice details...">
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-500"></div>
        </div>
      </PageContainer>
    );
  }

  if (!notice) {
    return (
      <PageContainer title="Notice Not Found" subtitle="This bulletin could not be located.">
        <div className="text-center py-12">
          <Button onClick={() => navigate('/notices')} variant="secondary">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Notices
          </Button>
        </div>
      </PageContainer>
    );
  }

  const priorityColorMap: Record<string, 'rose' | 'amber' | 'blue' | 'slate'> = {
    URGENT: 'rose',
    HIGH: 'amber',
    MEDIUM: 'blue',
    LOW: 'slate',
  };

  return (
    <PageContainer
      title={notice.title}
      subtitle={`Official Circular #${notice.id.slice(0, 8).toUpperCase()} • Published on ${new Date(notice.publish_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
      action={
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate('/notices')} variant="secondary" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Bulletins
          </Button>
          {!readMarked && (
            <Button onClick={handleMarkAsRead} variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-500">
              <CheckCircle className="w-4 h-4 mr-1.5" /> Acknowledge as Read
            </Button>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Circular Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8 border-[#1E293B] bg-[#0E1526]/80 backdrop-blur space-y-6">
            <div className="flex flex-wrap items-center gap-2.5 pb-4 border-b border-[#1E293B]">
              <Badge variant={priorityColorMap[notice.priority] || 'blue'}>
                {notice.priority} PRIORITY
              </Badge>
              <Badge variant="cyan">{notice.category}</Badge>
              <Badge variant="purple">Audience: {notice.target_role}</Badge>
              {notice.is_pinned && (
                <span className="inline-flex items-center text-xs font-semibold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-800">
                  <Pin className="w-3 h-3 mr-1" /> Pinned Bulletin
                </span>
              )}
              {readMarked && (
                <span className="inline-flex items-center text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800 ml-auto">
                  <CheckCircle className="w-3 h-3 mr-1" /> Acknowledged
                </span>
              )}
            </div>

            {/* Circular Body */}
            <div className="space-y-4 text-slate-200 leading-relaxed font-sans text-base">
              {notice.content.split('\n').map((paragraph, idx) => (
                <p key={idx} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Attachment block if present */}
            {notice.attachment_path && (
              <div className="mt-8 pt-6 border-t border-[#1E293B]">
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" /> Official Attachment Document
                </h4>
                <div className="flex items-center justify-between p-4 bg-[#111C35] rounded-xl border border-[#1E2E4F]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-cyan-950 text-cyan-400 rounded-lg border border-cyan-800">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">
                        {notice.attachment_name || 'Official_Circular_Attachment.pdf'}
                      </p>
                      <p className="text-xs text-slate-400">PDF Document • Digitally Signed</p>
                    </div>
                  </div>
                  <Button onClick={handleDownloadAttachment} variant="primary" size="sm">
                    <Download className="w-4 h-4 mr-1.5" /> Download Attachment
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar Metadata */}
        <div className="space-y-6">
          <Card className="p-6 border-[#1E293B] bg-[#0E1526]/80 backdrop-blur space-y-4">
            <h3 className="text-sm font-mono uppercase tracking-wider text-slate-400">Bulletin Metadata</h3>
            
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-[#1E293B]">
                <span className="text-slate-400 flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Issued By
                </span>
                <span className="font-semibold text-slate-200">{notice.creator_name || 'University Administration'}</span>
              </div>
              
              <div className="flex items-center justify-between py-2 border-b border-[#1E293B]">
                <span className="text-slate-400 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" /> Date Published
                </span>
                <span className="font-semibold text-slate-200">
                  {new Date(notice.publish_date).toLocaleDateString()}
                </span>
              </div>

              {notice.department_name && (
                <div className="flex items-center justify-between py-2 border-b border-[#1E293B]">
                  <span className="text-slate-400">Target Department</span>
                  <span className="font-semibold text-cyan-400">{notice.department_name}</span>
                </div>
              )}

              {notice.course_name && (
                <div className="flex items-center justify-between py-2 border-b border-[#1E293B]">
                  <span className="text-slate-400">Target Program</span>
                  <span className="font-semibold text-cyan-400">{notice.course_name}</span>
                </div>
              )}

              <div className="flex items-center justify-between py-2 border-b border-[#1E293B]">
                <span className="text-slate-400 flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5" /> Total Views
                </span>
                <span className="font-mono font-semibold text-slate-200">{notice.views_count} views</span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400 flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Acknowledgements
                </span>
                <span className="font-mono font-semibold text-emerald-400">{notice.read_count} students</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
};
export default NoticeDetailPage;
