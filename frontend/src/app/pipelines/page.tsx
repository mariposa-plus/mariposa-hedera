'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePipelinesStore } from '@/store/pipelineStore';
import { useAuthStore } from '@/store/authStore';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/Layout/AppLayout';

export default function PipelinesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PipelinesContent />
    </Suspense>
  );
}

function PipelinesContent() {
  const router = useRouter();
  const { isAuthenticated, user, hasHydrated } = useAuthStore();
  const { pipelines, isLoading, error, fetchPipelines, createPipeline, deletePipeline, duplicatePipeline } = usePipelinesStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [newPipelineDescription, setNewPipelineDescription] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchPipelines();
  }, [isAuthenticated, hasHydrated, router]);

  const handleCreatePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const pipelineId = await createPipeline(newPipelineName, newPipelineDescription);
      setShowCreateModal(false);
      setNewPipelineName('');
      setNewPipelineDescription('');
      router.push(`/pipelines/${pipelineId}`);
    } catch (err) {
      // Error handled in store
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pipeline?')) return;
    try {
      await deletePipeline(id);
    } catch (err) {
      // Error handled in store
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicatePipeline(id);
    } catch (err) {
      // Error handled in store
    }
  };

  if (!hasHydrated || !isAuthenticated) {
    return null;
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div style={{ padding: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>My Workflows</h1>
        <button className="btn" onClick={() => setShowCreateModal(true)}>
          Create Workflow
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {isLoading ? (
        <p>Loading workflows...</p>
      ) : pipelines.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
          <p>No workflows yet. Create your first workflow to get started!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {pipelines.map((pipeline) => (
            <div
              key={pipeline._id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '20px',
                backgroundColor: '#fff',
              }}
            >
              <h3>{pipeline.name}</h3>
              {pipeline.description && (
                <p style={{ color: '#666', fontSize: '14px', marginTop: '8px' }}>
                  {pipeline.description}
                </p>
              )}
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#999' }}>
                <div>Status: {pipeline.isActive ? '🟢 Active' : '⚪ Inactive'}</div>
                <div>Executions: {pipeline.executionCount}</div>
                {pipeline.lastExecutedAt && (
                  <div>Last run: {new Date(pipeline.lastExecutedAt).toLocaleString()}</div>
                )}
              </div>
              <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                <button
                  className="btn"
                  style={{ flex: 1, fontSize: '14px', padding: '8px' }}
                  onClick={() => router.push(`/pipelines/${pipeline._id}`)}
                >
                  Edit
                </button>
                <button
                  className="btn"
                  style={{ flex: 1, fontSize: '14px', padding: '8px', backgroundColor: '#6c757d' }}
                  onClick={() => handleDuplicate(pipeline._id)}
                >
                  Duplicate
                </button>
                <button
                  className="btn"
                  style={{ fontSize: '14px', padding: '8px', backgroundColor: '#dc3545' }}
                  onClick={() => handleDelete(pipeline._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              padding: '30px',
              maxWidth: '500px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: '20px' }}>Create New Workflow</h2>
            <form onSubmit={handleCreatePipeline}>
              <div className="form-group">
                <label htmlFor="name">Workflow Name</label>
                <input
                  type="text"
                  id="name"
                  value={newPipelineName}
                  onChange={(e) => setNewPipelineName(e.target.value)}
                  placeholder="My Workflow"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="description">Description (optional)</label>
                <textarea
                  id="description"
                  value={newPipelineDescription}
                  onChange={(e) => setNewPipelineDescription(e.target.value)}
                  placeholder="What does this workflow do?"
                  rows={3}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn" disabled={createLoading} style={{ flex: 1 }}>
                  {createLoading ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ flex: 1, backgroundColor: '#6c757d' }}
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
