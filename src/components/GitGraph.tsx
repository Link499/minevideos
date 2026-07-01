import { useState, useEffect } from 'react';

interface Commit {
  sha: string;
  message: string;
  timestamp: string;
  author: string;
  files_changed: string[];
  parent_sha: string | null;
}

interface Branch {
  name: string;
  head_sha: string;
  commits: Commit[];
}

interface GitGraphProps {
  sessionId: string;
  onCheckout?: (sha: string) => void;
  onBranch?: (branchName: string, fromSha: string) => void;
}

const API_BASE = 'https://web-production-77f47.up.railway.app';

export default function GitGraph({ sessionId, onCheckout, onBranch }: GitGraphProps) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  useEffect(() => {
    loadHistory();
    loadBranches();
  }, [sessionId]);

  const loadHistory = async () => {
    try {
      const token = localStorage.getItem('mv_token');
      const resp = await fetch(`${API_BASE}/api/v1/archive/history/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();
      if (data.success) {
        setCommits(data.commits);
      }
    } catch (err) {
      console.error('Failed to load git history:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      const token = localStorage.getItem('mv_token');
      const resp = await fetch(`${API_BASE}/api/v1/archive/branches/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();
      if (data.success) {
        setBranches(data.branches);
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  const handleCheckout = async (sha: string) => {
    try {
      const token = localStorage.getItem('mv_token');
      const resp = await fetch(`${API_BASE}/api/v1/archive/checkout?session_id=${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sha })
      });
      const data = await resp.json();
      if (data.success) {
        onCheckout?.(sha);
      }
    } catch (err) {
      console.error('Checkout failed:', err);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName || !selectedCommit) return;
    try {
      const token = localStorage.getItem('mv_token');
      const resp = await fetch(`${API_BASE}/api/v1/archive/branch?session_id=${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ branch_name: newBranchName, from_sha: selectedCommit })
      });
      const data = await resp.json();
      if (data.success) {
        onBranch?.(newBranchName, selectedCommit);
        setShowBranchDialog(false);
        setNewBranchName('');
        loadBranches();
      }
    } catch (err) {
      console.error('Create branch failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[#6c7086]">
        <span className="animate-pulse">Loading Git history...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* 左侧：分支列表 */}
      <div className="w-48 border-r border-[#313244] p-3 overflow-y-auto">
        <h3 className="text-xs font-medium text-[#6c7086] uppercase mb-2">Branches</h3>
        {branches.map(branch => (
          <div key={branch.name} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[#313244] cursor-pointer">
            <span className="text-[#a6e3a1]">●</span>
            <span className="text-xs text-[#cdd6f4]">{branch.name}</span>
          </div>
        ))}
        
        {selectedCommit && (
          <button
            onClick={() => setShowBranchDialog(true)}
            className="mt-3 w-full px-2 py-1 text-xs bg-[#313244] text-[#cdd6f4] rounded hover:bg-[#45475a]"
          >
            + New Branch
          </button>
        )}
      </div>

      {/* 右侧：Git Graph 可视化 */}
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium text-[#6c7086] uppercase">Commit History</h3>
          <span className="text-xs text-[#6c7086]">{commits.length} commits</span>
        </div>

        <div className="relative">
          {/* 竖线 */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[#45475a]" />

          {commits.map((commit, index) => (
            <div
              key={commit.sha}
              className={`relative flex items-start gap-3 py-2 pl-2 cursor-pointer rounded-lg px-2 ${
                selectedCommit === commit.sha ? 'bg-[#313244]' : 'hover:bg-[#1e1e2e]'
              }`}
              onClick={() => setSelectedCommit(commit.sha)}
            >
              {/* 节点 */}
              <div className={`relative z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                index === 0 
                  ? 'bg-[#cba4f7] border-[#cba4f7]' 
                  : 'bg-[#1e1e2e] border-[#45475a]'
              }`}>
                {index === 0 && <span className="text-[10px]">●</span>}
              </div>

              {/* 信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#cba4f7]">{commit.sha}</span>
                  {index === 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-[#a6e3a1] text-[#1e1e2e] rounded">HEAD</span>
                  )}
                </div>
                <p className="text-sm text-[#cdd6f4] truncate">{commit.message}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-[#6c7086]">{commit.author}</span>
                  <span className="text-[10px] text-[#6c7086]">
                    {new Date(commit.timestamp).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-[#6c7086]">
                    {commit.files_changed.length} file{commit.files_changed.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* 操作按钮 */}
              {selectedCommit === commit.sha && index !== 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleCheckout(commit.sha); }}
                  className="px-2 py-1 text-[10px] bg-[#f9e2af] text-[#1e1e2e] rounded hover:opacity-80"
                >
                  Checkout
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 创建分支对话框 */}
      {showBranchDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1e1e2e] border border-[#313244] rounded-lg p-4 w-80">
            <h3 className="text-sm font-medium text-[#cdd6f4] mb-3">Create New Branch</h3>
            <p className="text-xs text-[#6c7086] mb-2">
              From commit: <span className="font-mono text-[#cba4f7]">{selectedCommit}</span>
            </p>
            <input
              type="text"
              value={newBranchName}
              onChange={e => setNewBranchName(e.target.value)}
              placeholder="Branch name..."
              className="w-full px-3 py-2 bg-[#313244] border border-[#45475a] rounded text-sm text-[#cdd6f4] placeholder-[#6c7086] mb-3"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBranchDialog(false)}
                className="px-3 py-1.5 text-xs bg-[#313244] text-[#cdd6f4] rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBranch}
                className="px-3 py-1.5 text-xs bg-[#cba4f7] text-[#1e1e2e] rounded font-medium"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
