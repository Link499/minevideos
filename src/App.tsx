import React, { useState, useEffect } from 'react';
import IDELayout from './components/IDELayout';
import GitGraph from './components/GitGraph';
import FileExplorer from './components/FileExplorer';
import CodeEditor from './components/CodeEditor';
import PreviewPanel from './components/PreviewPanel';
import './App.css';

// API base URL
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://web-production-77f47.up.railway.app';

interface VideoTask {
  id: number;
  prompt: string;
  status: string;
  video_url?: string;
  created_at: string;
}

interface FileContent {
  path: string;
  content: string;
  language: string;
}

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [sessionId, setSessionId] = useState<string>('default');
  const [mode, setMode] = useState<'beginner' | 'professional'>('beginner');
  
  // File state
  const [files, setFiles] = useState<FileContent[]>([]);
  const [activeFile, setActiveFile] = useState<FileContent | null>(null);
  
  // Video task state
  const [currentTask, setCurrentTask] = useState<VideoTask | null>(null);
  const [taskHistory, setTaskHistory] = useState<VideoTask[]>([]);
  
  // Console logs
  const [logs, setLogs] = useState<string[]>([]);
  
  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Fetch files from backend
  useEffect(() => {
    if (!token || !sessionId) return;
    
    fetch(`${API_BASE}/api/v1/archive/file/${sessionId}/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.files) {
          setFiles(data.files.map((f: any) => ({
            path: f.path,
            content: f.content || '',
            language: f.path.split('.').pop() || 'text'
          })));
        }
      })
      .catch(err => addLog(`Failed to load files: ${err.message}`));
  }, [token, sessionId]);

  // Fetch task history
  useEffect(() => {
    if (!token) return;
    
    fetch(`${API_BASE}/api/v1/video/tasks`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.tasks) {
          setTaskHistory(data.tasks);
        }
      })
      .catch(err => addLog(`Failed to load tasks: ${err.message}`));
  }, [token]);

  // Handle file selection
  const handleFileSelect = (path: string) => {
    const file = files.find(f => f.path === path);
    if (file) {
      setActiveFile(file);
      addLog(`Opened: ${path}`);
    }
  };

  // Handle file save
  const handleFileSave = async (content: string) => {
    if (!activeFile || !token) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/v1/archive/file/${sessionId}/${activeFile.path}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });
      
      if (res.ok) {
        setActiveFile({ ...activeFile, content });
        setFiles(files.map(f => f.path === activeFile.path ? { ...f, content } : f));
        addLog(`Saved: ${activeFile.path}`);
      }
    } catch (err: any) {
      addLog(`Save failed: ${err.message}`);
    }
  };

  // Handle video generation
  const handleGenerateVideo = async (prompt: string) => {
    if (!token) {
      addLog('Not authenticated');
      return;
    }

    addLog(`Generating video: ${prompt}`);
    
    try {
      const formData = new FormData();
      formData.append('prompt', prompt);
      
      const res = await fetch(`${API_BASE}/api/v1/video/generate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      const data = await res.json();
      
      if (data.task_id) {
        const task: VideoTask = {
          id: data.task_id,
          prompt,
          status: 'processing',
          created_at: new Date().toISOString()
        };
        setCurrentTask(task);
        setTaskHistory([task, ...taskHistory]);
        addLog(`Task created: #${data.task_id}`);
        
        // Poll for completion
        pollTaskStatus(data.task_id);
      }
    } catch (err: any) {
      addLog(`Generation failed: ${err.message}`);
    }
  };

  // Poll task status
  const pollTaskStatus = async (taskId: number) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/video/tasks/${taskId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval);
          setCurrentTask(prev => prev && prev.id === taskId ? { ...prev, ...data } : prev);
          setTaskHistory(prev => prev.map(t => t.id === taskId ? { ...t, ...data } : t));
          addLog(`Task #${taskId} ${data.status}`);
        } else {
          setCurrentTask(prev => prev && prev.id === taskId ? { ...prev, status: data.status } : prev);
        }
      } catch (err) {
        clearInterval(interval);
      }
    }, 5000);
  };

  // Handle git operations
  const handleGitCheckpoint = async (message: string) => {
    if (!token) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/v1/archive/checkpoint`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: sessionId,
          message
        })
      });
      
      if (res.ok) {
        addLog(`Checkpoint: ${message}`);
      }
    } catch (err: any) {
      addLog(`Checkpoint failed: ${err.message}`);
    }
  };

  const handleGitCheckout = async (commitHash: string) => {
    if (!token) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/v1/archive/checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: sessionId,
          commit_hash: commitHash
        })
      });
      
      if (res.ok) {
        addLog(`Checked out: ${commitHash}`);
        // Refresh files
        window.location.reload();
      }
    } catch (err: any) {
      addLog(`Checkout failed: ${err.message}`);
    }
  };

  // Render beginner mode (simplified wizard)
  if (mode === 'beginner') {
    return (
      <div className="app">
        <div className="beginner-mode">
          <h1>MineVideos AI</h1>
          <p>Create AI-powered videos from your ideas</p>
          
          <div className="wizard">
            <div className="step">
              <h3>Step 1: Describe your video</h3>
              <textarea
                placeholder="A beautiful sunset over the ocean..."
                rows={4}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #313244', background: '#1e1e2e', color: '#cdd6f4' }}
              />
            </div>
            
            <button
              onClick={() => {
                const prompt = (document.querySelector('textarea') as HTMLTextAreaElement)?.value;
                if (prompt) handleGenerateVideo(prompt);
              }}
              className="generate-btn"
            >
              Generate Video
            </button>
            
            {currentTask && (
              <div className="task-status">
                <p>Status: {currentTask.status}</p>
                {currentTask.video_url && (
                  <video src={currentTask.video_url} controls style={{ maxWidth: '100%', borderRadius: '8px' }} />
                )}
              </div>
            )}
          </div>
          
          <button
            onClick={() => setMode('professional')}
            className="mode-switch"
          >
            Switch to Professional Mode →
          </button>
        </div>
      </div>
    );
  }

  // Render professional mode (IDE layout)
  return (
    <div className="app">
      <IDELayout
        mode={mode}
        onModeChange={setMode}
        leftPanel={
          <div className="panel-stack">
            <GitGraph
              commits={[]}
              branches={['main']}
              currentBranch="main"
              onCheckout={handleGitCheckout}
              onCreateBranch={(name) => addLog(`Create branch: ${name}`)}
              onCheckpoint={(msg) => handleGitCheckpoint(msg)}
            />
            <FileExplorer
              files={files.map(f => f.path)}
              onFileSelect={handleFileSelect}
            />
          </div>
        }
        centerPanel={
          <CodeEditor
            content={activeFile?.content || ''}
            language={activeFile?.language || 'text'}
            fileName={activeFile?.path || 'No file selected'}
            onSave={handleFileSave}
          />
        }
        rightPanel={
          <PreviewPanel
            currentTask={currentTask ? {
              prompt: currentTask.prompt,
              status: currentTask.status,
              progress: currentTask.status === 'completed' ? 100 : currentTask.status === 'processing' ? 50 : 0,
              videoUrl: currentTask.video_url,
              error: null
            } : null}
            outputs={taskHistory.filter(t => t.video_url).map(t => ({
              type: 'video' as const,
              name: `Task #${t.id}`,
              url: t.video_url!,
              size: 0
            }))}
            logs={logs}
            onClearLogs={() => setLogs([])}
            onGenerateVideo={handleGenerateVideo}
          />
        }
      />
    </div>
  );
}

export default App;
