import { useState } from 'react';
import FileExplorer from './FileExplorer';
import CodeEditor from './CodeEditor';
import PreviewPanel from './PreviewPanel';
import GitGraph from './GitGraph';

type ViewMode = 'novice' | 'pro';

interface IDELayoutProps {
  sessionId: string;
  onModeSwitch?: (mode: ViewMode) => void;
}

export default function IDELayout({ sessionId, onModeSwitch }: IDELayoutProps) {
  const [mode, setMode] = useState<ViewMode>('pro');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [showGitGraph, setShowGitGraph] = useState(false);

  const handleModeSwitch = (newMode: ViewMode) => {
    setMode(newMode);
    onModeSwitch?.(newMode);
  };

  const handleFileSelect = async (path: string) => {
    setSelectedFile(path);
    // TODO: 从后端获取文件内容
    setFileContent(`// 文件内容: ${path}\n// 从后端 API 加载`);
  };

  const handleFileSave = async (content: string) => {
    if (!selectedFile) return;
    // TODO: 保存到后端，同时创建 Git checkpoint
    console.log('Saving file:', selectedFile, content);
  };

  return (
    <div className="flex flex-col h-screen bg-[#1e1e2e] text-[#cdd6f4]">
      {/* 顶部工具栏 */}
      <div className="h-10 bg-[#181825] border-b border-[#313244] flex items-center px-4 justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-[#cba4f7]">MineVideos Studio</span>
          <span className="text-xs text-[#6c7086]">Session: {sessionId}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGitGraph(!showGitGraph)}
            className={`px-3 py-1 text-xs rounded ${
              showGitGraph 
                ? 'bg-[#cba4f7] text-[#1e1e2e]' 
                : 'bg-[#313244] text-[#cdd6f4] hover:bg-[#45475a]'
            }`}
          >
            📊 Git Graph
          </button>
          
          <div className="flex bg-[#313244] rounded overflow-hidden">
            <button
              onClick={() => handleModeSwitch('novice')}
              className={`px-3 py-1 text-xs ${
                mode === 'novice' ? 'bg-[#a6e3a1] text-[#1e1e2e]' : 'text-[#cdd6f4] hover:bg-[#45475a]'
              }`}
            >
              🎨 新手模式
            </button>
            <button
              onClick={() => handleModeSwitch('pro')}
              className={`px-3 py-1 text-xs ${
                mode === 'pro' ? 'bg-[#cba4f7] text-[#1e1e2e]' : 'text-[#cdd6f4] hover:bg-[#45475a]'
              }`}
            >
              ⚡ 专业模式
            </button>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：文件目录 */}
        <div className="w-60 bg-[#181825] border-r border-[#313244] overflow-y-auto">
          <FileExplorer 
            sessionId={sessionId}
            onFileSelect={handleFileSelect}
          />
        </div>

        {/* 中间：编辑器 / 新手模式向导 */}
        <div className="flex-1 flex flex-col">
          {mode === 'pro' ? (
            <CodeEditor
              filePath={selectedFile}
              content={fileContent}
              onSave={handleFileSave}
            />
          ) : (
            <NoviceWizard sessionId={sessionId} />
          )}
        </div>

        {/* 右侧：预览面板 */}
        <div className="w-96 bg-[#181825] border-l border-[#313244] overflow-y-auto">
          <PreviewPanel sessionId={sessionId} />
        </div>
      </div>

      {/* Git Graph 面板（可折叠） */}
      {showGitGraph && (
        <div className="h-64 bg-[#181825] border-t border-[#313244] overflow-y-auto">
          <GitGraph sessionId={sessionId} />
        </div>
      )}
    </div>
  );
}

/** 新手模式向导 */
function NoviceWizard({ sessionId }: { sessionId: string }) {
  const [step, setStep] = useState(0);
  
  const steps = [
    { title: '描述你的想法', icon: '💡' },
    { title: 'AI 生成问题', icon: '❓' },
    { title: '回答并完善', icon: '✏️' },
    { title: 'AI 生成视频', icon: '🎬' },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-lg w-full">
        {/* 步骤指示器 */}
        <div className="flex justify-between mb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                i <= step ? 'bg-[#cba4f7] text-[#1e1e2e]' : 'bg-[#313244] text-[#6c7086]'
              }`}>
                {s.icon}
              </div>
              <span className={`text-xs mt-2 ${i <= step ? 'text-[#cba4f7]' : 'text-[#6c7086]'}`}>
                {s.title}
              </span>
            </div>
          ))}
        </div>

        {/* 当前步骤内容 */}
        <div className="bg-[#313244] rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">{steps[step].title}</h2>
          
          {step === 0 && (
            <div>
              <textarea
                placeholder="描述你想创作的视频..."
                className="w-full h-32 bg-[#1e1e2e] border border-[#45475a] rounded p-3 text-[#cdd6f4] placeholder-[#6c7086] resize-none"
              />
              <button 
                onClick={() => setStep(1)}
                className="mt-4 px-6 py-2 bg-[#cba4f7] text-[#1e1e2e] rounded font-medium hover:opacity-90"
              >
                下一步 →
              </button>
            </div>
          )}
          
          {step > 0 && (
            <div className="text-[#6c7086]">
              <p>步骤 {step + 1} 的内容区域</p>
              <button 
                onClick={() => setStep(Math.max(0, step - 1))}
                className="mt-4 mr-2 px-4 py-2 bg-[#45475a] text-[#cdd6f4] rounded"
              >
                ← 上一步
              </button>
              {step < steps.length - 1 && (
                <button 
                  onClick={() => setStep(step + 1)}
                  className="mt-4 px-4 py-2 bg-[#cba4f7] text-[#1e1e2e] rounded"
                >
                  下一步 →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
