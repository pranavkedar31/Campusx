import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, ShieldCheck, Layers, Calendar, User, BookOpen, Award, ArrowLeft } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import apiClient from '../services/api';

export const VerifyCertificatePage: React.FC = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyCert = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/certificates/verify/${uuid}`);
        setData(res.data);
      } catch (err: any) {
        setData({
          is_valid: false,
          certificate_id: uuid,
          status: 'ERROR',
          message: 'Unable to connect to university verification service.',
        });
      } finally {
        setLoading(false);
      }
    };

    if (uuid) {
      verifyCert();
    }
  }, [uuid]);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-2">
            <Layers className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">CampusX University</h1>
          <p className="text-xs text-slate-400 font-mono uppercase tracking-wider">
            Public Digital Credential Verification Authority
          </p>
        </div>

        {/* Verification Result Card */}
        {loading ? (
          <Card className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-xs text-slate-400">Verifying cryptographic signature against ledger...</p>
          </Card>
        ) : (
          <Card
            className={`border-2 ${
              data?.is_valid
                ? 'border-emerald-500/40 bg-emerald-950/10'
                : 'border-rose-500/40 bg-rose-950/10'
            }`}
          >
            {/* Status Header */}
            <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
              {data?.is_valid ? (
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                  <XCircle className="w-7 h-7" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white">
                    {data?.is_valid ? 'Authentic Institutional Credential' : 'Invalid or Unverified Document'}
                  </span>
                  <Badge variant={data?.is_valid ? 'emerald' : 'rose'} size="sm">
                    {data?.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{data?.message}</p>
              </div>
            </div>

            {/* Document Details Grid */}
            <div className="py-4 space-y-3 font-sans text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
                <span className="text-slate-400 flex items-center gap-2">
                  <Award className="w-4 h-4 text-cyan-400" /> Certificate Identifier:
                </span>
                <span className="font-mono text-cyan-300 font-semibold">{data?.certificate_id}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
                <span className="text-slate-400 flex items-center gap-2">
                  <User className="w-4 h-4 text-cyan-400" /> Student Full Name:
                </span>
                <span className="font-semibold text-white">{data?.student_name}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
                <span className="text-slate-400 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-cyan-400" /> Roll Number:
                </span>
                <span className="font-mono text-slate-200">{data?.roll_number}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
                <span className="text-slate-400">Department / School:</span>
                <span className="text-slate-200">{data?.department}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
                <span className="text-slate-400">Course / Degree:</span>
                <span className="text-slate-200">{data?.course}</span>
              </div>

              {data?.issue_date && (
                <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-400" /> Date of Official Issue:
                  </span>
                  <span className="text-slate-200">
                    {new Date(data?.issue_date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Seal Footer */}
            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" /> Cryptographically stamped
              </span>
              <span>CampusX Registrar Signature Authority</span>
            </div>
          </Card>
        )}

        {/* Back Link */}
        <div className="text-center pt-2">
          <Link
            to="/login"
            className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to CampusX Portal
          </Link>
        </div>
      </div>
    </div>
  );
};
