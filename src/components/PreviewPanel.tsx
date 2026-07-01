import { useState, useEffect } from 'react';

interface PreviewPanelProps {
  sessionId: string;
}

interface TaskStatus {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  prompt: string;
  video_url: string | null;
  error_message: string | null;
}

const API_BASE = 'https://web-production-77f47.up.railway.app';

export default function PreviewPanel({ sessionId }: PreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'output' | 'console'>('preview');
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // 轮询任务状态
    const interval = setInterval(checkTaskStatus, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const checkTaskStatus = async () => {
    try {
      const token = localStorage.getItem('mv_token');
      if (!token) return;

      const resp = await fetch(`${API_BASE}/api/v1/video/tasks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();
      
      if (data.tasks && data.tasks.length > 0) {
        const latestTask = data.tasks[0];
        setTaskStatus(latestTask);
        
        // 添加日志
        if (latestTask.status === 'processing' && latestTask.progress !== undefined) {
          addLog(`[${new Date().toLocaleTimeString()}] Progress: ${latestTask.progress}%`);
        }
        if (latestTask.status === 'completed') {
          addLog(`[${new Date().toLocaleTimeString()}] ✅ Video generation completed!`);
        }
        if (latestTask.status === 'failed') {
          addLog(`[${new Date().toLocaleTimeString()}] ❌ Failed: ${latestTask.error_message}`);
        }
      }
    } catch (err) {
      // Silent fail for polling
    }
  };

  const addLog = (log: string) => {
    setLogs(prev => [...prev.slice(-99), log]); // 保留最近100条
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab 栏 */}
      <div className="h-9 bg-[#181825] border-b border-[#313244] flex items-center px-2">
        {(['preview', 'output', 'console'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs capitalize rounded-t transition-colors ${
              activeTab === tab
                ? 'bg-[#1e1e2e] text-[#cdd6f4] border-t border-x border-[#313244]'
                : 'text-[#6c7086] hover:text-[#cdd6f4]'
            }`}
          >
            {tab === 'preview' ? '👁 Preview' : tab === 'output' ? '🎬 Output' : '📋 Console'}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <div className="space-y-4">
            {/* 视频预览 */}
            {taskStatus?.video_url ? (
              <div className="rounded-lg overflow-hidden bg-black aspect-video">
                <video
                  src={taskStatus.video_url}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="rounded-lg bg-[#181825] border border-[#313244] aspect-video flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl mb-2">🎬</div>
                  <p className="text-xs text-[#6c7086]">
                    {taskStatus?.status === 'processing' 
                      ? `Generating... ${taskStatus.progress}%`
                      : 'No video yet'
                    }
                  </p>
                </div>
              </div>
            )}

            {/* 进度条 */}
            {taskStatus?.status === 'processing' && (
              <div>
                <div className="flex justify-between text-[10px] text-[#6c7086] mb-1">
                  <span>Generating video...</span>
                  <span>{taskStatus.progress}%</span>
                </div>
                <div className="h-1.5 bg-[#313244] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#cba4f7] to-[#a6e3a1] transition-all duration-500"
                    style={{ width: `${taskStatus.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Prompt 信息 */}
            {taskStatus?.prompt && (
              <div className="bg-[#181825] rounded-lg p-3">
                <h4 className="text-[10px] text-[#6c7086] uppercase mb-1">Prompt</h4>
                <p className="text-xs text-[#cdd6f4]">{taskStatus.prompt}</p>
              </div>
            )}
          </div>
        )}

        {/* Output Tab */}
        {activeTab === 'output' && (
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-[#6c7086] uppercase">Generated Assets</h4>
            
            {taskStatus?.video_url ? (
              <div className="bg-[#181825] rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🎬</span>
                  <div>
                    <p className="text-xs text-[#cdd6f4]">final_video.mp4</p>
                    <p className="text-[10px] text-[#6c7086]">
                      {taskStatus.tokens_used ? `${taskStatus.tokens_used} tokens` : 'Completed'}
                    </p>
                  </div>
                </div>
                <a
                  href={taskStatus.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-3 py-1 text-xs bg-[#cba4f7] text-[#1e1e2e] rounded font-medium hover:opacity-80"
                >
                  Download
                </a>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-xs text-[#6c7086]">No output yet</p>
                <p className="text-[10px] text-[#45475a] mt-1">
                  Start generating a video to see results here
                </p>
              </div>
            )}
          </div>
        )}

        {/* Console Tab */}
        {activeTab === 'console' && (
          <div className="bg-[#181825] rounded-lg p-3 font-mono">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] text-[#6c7086] uppercase">Output Log</h4>
              <button
                onClick={() => setLogs([])}
                className="text-[10px] text-[#6c7086] hover:text-[#cdd6f4]"
              >
                Clear
              </button>
            </div>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-[10px] text-[#45475a]">Waiting for output...</p>
              ) : (
                logs.map((log, i) => (
                  <p key={i} className="text-[10px] text-[#a6adc8] font-mono">{log}</p>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
