import { useState, useEffect } from 'react';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

interface FileExplorerProps {
  sessionId: string;
  onFileSelect: (path: string) => void;
}

const API_BASE = 'https://web-production-77f47.up.railway.app';

// 图标映射
const FILE_ICONS: Record<string, string> = {
  'tsx': '⚛️',
  'ts': '📘',
  'py': '🐍',
  'json': '📋',
  'md': '📝',
  'css': '🎨',
  'html': '🌐',
  'mp4': '🎬',
  'png': '🖼️',
  'jpg': '🖼️',
};

function getIcon(name: string, type: 'file' | 'folder'): string {
  if (type === 'folder') return '📁';
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return FILE_ICONS[ext] || '📄';
}

export default function FileExplorer({ sessionId, onFileSelect }: FileExplorerProps) {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFiles();
  }, [sessionId]);

  const loadFiles = async () => {
    try {
      const token = localStorage.getItem('mv_token');
      // 从后端获取当前 session 的文件列表
      const resp = await fetch(`${API_BASE}/api/v1/archive/history/${sessionId}?limit=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();
      
      if (data.success && data.commits.length > 0) {
        const latestCommit = data.commits[0];
        // 从最新 commit 构建文件树
        const fileTree = buildFileTree(latestCommit.files_changed);
        setFiles(fileTree);
      }
    } catch (err) {
      console.error('Failed to load files:', err);
      // 使用默认文件结构
      setFiles(getDefaultFileTree());
    } finally {
      setLoading(false);
    }
  };

  const buildFileTree = (paths: string[]): FileNode[] => {
    const root: FileNode[] = [];
    
    for (const path of paths) {
      const parts = path.split('/');
      let current = root;
      
      for (let i = 0; i < parts.length; i++) {
        const name = parts[i];
        const isFile = i === parts.length - 1;
        const fullPath = parts.slice(0, i + 1).join('/');
        
        let existing = current.find(n => n.path === fullPath);
        if (!existing) {
          existing = {
            name,
            path: fullPath,
            type: isFile ? 'file' : 'folder',
            children: isFile ? undefined : []
          };
          current.push(existing);
        }
        
        if (!isFile && existing.children) {
          current = existing.children;
        }
      }
    }
    
    return root;
  };

  const getDefaultFileTree = (): FileNode[] => [
    {
      name: 'prompts',
      path: 'prompts',
      type: 'folder',
      children: [
        { name: 'system.md', path: 'prompts/system.md', type: 'file' },
        { name: 'scene1.md', path: 'prompts/scene1.md', type: 'file' },
      ]
    },
    {
      name: 'assets',
      path: 'assets',
      type: 'folder',
      children: [
        { name: 'reference.png', path: 'assets/reference.png', type: 'file' },
      ]
    },
    {
      name: 'output',
      path: 'output',
      type: 'folder',
      children: [
        { name: 'final.mp4', path: 'output/final.mp4', type: 'file' },
      ]
    },
    { name: 'config.json', path: 'config.json', type: 'file' },
    { name: 'README.md', path: 'README.md', type: 'file' },
  ];

  const toggleExpand = (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expanded.has(node.path);
    const paddingLeft = depth * 16 + 8;

    return (
      <div key={node.path}>
        <div
          className={`flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-[#313244] rounded transition-colors`}
          style={{ paddingLeft }}
          onClick={() => {
            if (node.type === 'folder') {
              toggleExpand(node.path);
            } else {
              onFileSelect(node.path);
            }
          }}
        >
          {node.type === 'folder' && (
            <span className="text-[10px] text-[#6c7086] w-3">
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          {node.type === 'file' && <span className="w-3" />}
          <span className="text-sm">{getIcon(node.name, node.type)}</span>
          <span className={`text-xs ${node.type === 'folder' ? 'text-[#cdd6f4] font-medium' : 'text-[#bac2de]'}`}>
            {node.name}
          </span>
        </div>
        
        {node.type === 'folder' && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4 text-xs text-[#6c7086] animate-pulse">
        Loading files...
      </div>
    );
  }

  return (
    <div className="py-2">
      {/* 标题 */}
      <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-[10px] font-medium text-[#6c7086] uppercase tracking-wider">
          Explorer
        </span>
        <span className="text-[10px] text-[#6c7086]">
          Session: {sessionId.slice(0, 8)}
        </span>
      </div>

      {/* 文件树 */}
      <div className="px-1">
        {files.map(node => renderNode(node))}
      </div>

      {/* 空状态 */}
      {files.length === 0 && (
        <div className="px-3 py-4 text-xs text-[#6c7086] text-center">
          No files yet. Start creating!
        </div>
      )}
    </div>
  );
}
