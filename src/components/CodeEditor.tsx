import { useState, useEffect, useRef } from 'react';

interface CodeEditorProps {
  filePath: string | null;
  content: string;
  onSave: (content: string) => void;
}

// 简单的语法高亮关键词
const KEYWORDS: Record<string, string[]> = {
  python: ['def', 'class', 'import', 'from', 'return', 'if', 'else', 'elif', 'for', 'while', 'try', 'except', 'with', 'as', 'async', 'await', 'True', 'False', 'None'],
  typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'export', 'interface', 'type', 'class', 'extends', 'implements', 'async', 'await', 'true', 'false', 'null', 'undefined'],
};

function getLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  if (['py'].includes(ext)) return 'python';
  if (['ts', 'tsx', 'js', 'jsx'].includes(ext)) return 'typescript';
  if (['json'].includes(ext)) return 'json';
  if (['md'].includes(ext)) return 'markdown';
  return 'plaintext';
}

export default function CodeEditor({ filePath, content, onSave }: CodeEditorProps) {
  const [value, setValue] = useState(content);
  const [modified, setModified] = useState(false);
  const [language, setLanguage] = useState('plaintext');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setValue(content);
    setModified(false);
    if (filePath) {
      setLanguage(getLanguage(filePath));
    }
  }, [content, filePath]);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    setModified(true);
  };

  const handleSave = () => {
    onSave(value);
    setModified(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + S 保存
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
    // Tab 缩进
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      handleChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const lines = value.split('\n');
  const fileName = filePath ? filePath.split('/').pop() : 'untitled';

  if (!filePath) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#1e1e2e]">
        <div className="text-center">
          <div className="text-4xl mb-4">📝</div>
          <p className="text-[#6c7086] text-sm">Select a file to edit</p>
          <p className="text-[#45475a] text-xs mt-2">or create a new one from the explorer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#1e1e2e]">
      {/* 编辑器标签栏 */}
      <div className="h-9 bg-[#181825] border-b border-[#313244] flex items-center px-3 justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#cdd6f4]">{fileName}</span>
          {modified && (
            <span className="w-2 h-2 rounded-full bg-[#f9e2af]" />
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#6c7086] uppercase">{language}</span>
          {modified && (
            <button
              onClick={handleSave}
              className="px-2 py-0.5 text-[10px] bg-[#a6e3a1] text-[#1e1e2e] rounded font-medium hover:opacity-80"
            >
              Save (⌘S)
            </button>
          )}
        </div>
      </div>

      {/* 编辑器主体 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 行号 */}
        <div
          ref={lineNumbersRef}
          className="w-12 bg-[#181825] text-right py-3 overflow-hidden select-none"
        >
          {lines.map((_, i) => (
            <div key={i} className="px-2 text-[11px] leading-[20px] text-[#45475a] font-mono">
              {i + 1}
            </div>
          ))}
        </div>

        {/* 代码区域 */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          className="flex-1 bg-[#1e1e2e] text-[#cdd6f4] font-mono text-xs leading-[20px] p-3 resize-none outline-none overflow-auto"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
      </div>

      {/* 底部状态栏 */}
      <div className="h-6 bg-[#181825] border-t border-[#313244] flex items-center px-3 justify-between">
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-[#6c7086]">
            Lines: {lines.length}
          </span>
          <span className="text-[10px] text-[#6c7086]">
            Chars: {value.length}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-[#6c7086]">
            {filePath}
          </span>
          <span className="text-[10px] text-[#6c7086]">
            UTF-8
          </span>
        </div>
      </div>
    </div>
  );
}
