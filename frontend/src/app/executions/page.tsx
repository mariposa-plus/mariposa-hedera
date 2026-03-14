'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/Layout/AppLayout';
import { api } from '@/lib/api';
import { Play, CheckCircle, XCircle, Clock, RefreshCw, ArrowRight, Activity } from 'lucide-react';

interface Execution {
  _id: string;
  pipelineId: { _id: string; name: string } | string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  error?: string;
  nodeResults?: Record<string, any>;
}

export default function ExecutionsPage() {
  const router = useRouter();
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExecutions = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/executions');
      setExecutions(response.data.executions || response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load executions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutions();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} color="#10b981" />;
      case 'failed': return <XCircle size={16} color="#ef4444" />;
      case 'running': return <Play size={16} color="#3b82f6" />;
      default: return <Clock size={16} color="#f59e0b" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'failed': return '#ef4444';
      case 'running': return '#3b82f6';
      default: return '#f59e0b';
    }
  };

  const formatDuration = (start: string, end?: string) => {
    if (!end) return 'Running...';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleString();
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div style={{ padding: '40px', minHeight: '100vh' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a2e', marginBottom: '4px' }}>
                Executions
              </h1>
              <p style={{ color: '#6c757d', fontSize: '14px', margin: 0 }}>
                View the history and results of your workflow executions.
              </p>
            </div>
            <button
              onClick={fetchExecutions}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px', background: '#f8f9fa', border: '1px solid #e9ecef',
                borderRadius: '8px', color: '#1a1a2e', fontSize: '14px', fontWeight: '500',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div style={{
              background: '#fff', borderRadius: '16px', padding: '60px',
              textAlign: 'center', color: '#6c757d', border: '1px solid #e9ecef',
            }}>
              Loading executions...
            </div>
          ) : error ? (
            <div style={{
              background: '#fff', borderRadius: '16px', padding: '40px',
              textAlign: 'center', border: '1px solid #fecaca', color: '#ef4444',
            }}>
              {error}
            </div>
          ) : executions.length === 0 ? (
            <div style={{
              background: '#fff', borderRadius: '16px', padding: '60px 40px',
              textAlign: 'center', border: '2px dashed #e9ecef',
            }}>
              <Activity size={48} color="#e9ecef" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#6c757d', marginBottom: '8px' }}>
                No executions yet
              </h3>
              <p style={{ color: '#adb5bd', marginBottom: '20px' }}>
                Run a workflow to see execution history here.
              </p>
              <button
                onClick={() => router.push('/pipelines')}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff', border: 'none', borderRadius: '8px',
                  padding: '12px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                }}
              >
                Go to Workflows
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {executions.map((exec) => {
                const pipelineName = typeof exec.pipelineId === 'object' ? exec.pipelineId.name : 'Unknown Pipeline';
                const pipelineIdStr = typeof exec.pipelineId === 'object' ? exec.pipelineId._id : exec.pipelineId;

                return (
                  <div
                    key={exec._id}
                    style={{
                      background: '#fff', borderRadius: '12px', padding: '20px',
                      border: '1px solid #e9ecef', display: 'flex',
                      justifyContent: 'space-between', alignItems: 'center',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onClick={() => router.push(`/pipelines/${pipelineIdStr}`)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#667eea';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e9ecef';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                      {getStatusIcon(exec.status)}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a2e', marginBottom: '4px' }}>
                          {pipelineName}
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6c757d' }}>
                          <span style={{ color: getStatusColor(exec.status), fontWeight: '600', textTransform: 'capitalize' }}>
                            {exec.status}
                          </span>
                          <span>{formatTime(exec.startedAt)}</span>
                          <span>{formatDuration(exec.startedAt, exec.completedAt)}</span>
                        </div>
                        {exec.error && (
                          <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                            {exec.error}
                          </div>
                        )}
                      </div>
                    </div>
                    <ArrowRight size={18} color="#667eea" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
