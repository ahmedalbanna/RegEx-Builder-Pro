
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Code, Settings, Info, Copy, Check, Terminal, Zap, Hash, Type as TypeIcon, Globe, Paintbrush, Eraser, Sparkles, MoveHorizontal, HelpCircle, X, Microscope, List, ClipboardCheck } from 'lucide-react';
import hljs from 'highlight.js';
import { generatePatternAlgorithmic } from './services/patternGenerator';
import { RegExFlags, RegExMatch, GeneratorResult, BrushType, Annotation } from './types';

const App: React.FC = () => {
  const [targetText, setTargetText] = useState('');
  const [sourceText, setSourceText] = useState('Example: Find User Ahmad with ID 10203. Try painting "User" red, "Ahmad" green, and "ID" red!');
  const [regexPattern, setRegexPattern] = useState('');
  const [brush, setBrush] = useState<BrushType>('green');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [flags, setFlags] = useState<RegExFlags>({ 
    global: true, 
    ignoreCase: true, 
    multiline: false,
    wholeWord: false,
    searchMode: 'literal',
    startWord: '[',
    endWord: ']',
    wordA: 'User',
    wordB: 'ID'
  });
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const sandboxRef = useRef<HTMLDivElement>(null);

  const handleSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const container = sandboxRef.current;
    if (!container || !container.contains(range.startContainer)) return;

    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(container);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;
    const end = start + range.toString().length;

    setAnnotations(prev => {
      const filtered = prev.filter(a => !(start < a.end && end > a.start));
      if (brush === 'eraser') return filtered;

      const newAnn: Annotation = {
        id: Math.random().toString(36).substring(2, 9),
        start,
        end,
        type: brush === 'green' ? 'match' : 'context'
      };
      
      if (flags.searchMode !== 'smart') {
        setFlags(f => ({ ...f, searchMode: 'smart' }));
      }
      
      return [...filtered, newAnn].sort((a, b) => a.start - b.start);
    });
    
    selection.removeAllRanges();
  };

  const result: GeneratorResult | null = useMemo(() => {
    if (flags.searchMode === 'literal' && !targetText) return null;
    if (flags.searchMode === 'between' && (!flags.startWord || !flags.endWord)) return null;
    if (flags.searchMode === 'smart' && annotations.length === 0) return null;
    if (flags.searchMode === 'gap' && (!flags.wordA || !flags.wordB)) return null;
    
    return generatePatternAlgorithmic(targetText, flags, annotations, sourceText);
  }, [targetText, flags, annotations, sourceText]);

  useEffect(() => {
    if (result) setRegexPattern(result.pattern);
  }, [result]);

  const currentRegex = useMemo(() => {
    try {
      let flagStr = (flags.global ? 'g' : '') + (flags.ignoreCase ? 'i' : '') + (flags.multiline ? 'm' : '');
      return new RegExp(regexPattern || '^$', flagStr);
    } catch (e) { return null; }
  }, [regexPattern, flags]);

  const matches = useMemo(() => {
    if (!currentRegex || !sourceText || !regexPattern) return [];
    try {
      const results: RegExMatch[] = [];
      let match;
      const tempRegex = new RegExp(currentRegex.source, currentRegex.flags);
      if (tempRegex.global) {
        while ((match = tempRegex.exec(sourceText)) !== null) {
          results.push({ index: match.index, text: match[0] });
          if (match[0].length === 0) tempRegex.lastIndex++;
        }
      } else {
        match = tempRegex.exec(sourceText);
        if (match) results.push({ index: match.index, text: match[0] });
      }
      return results;
    } catch (e) { return []; }
  }, [currentRegex, sourceText, regexPattern]);

  const renderAnnotatedText = () => {
    if (!sourceText) return <span className="text-slate-600 italic">Enter some text below to start testing...</span>;
    
    const highlights = matches.map(m => ({ start: m.index, end: m.index + m.text.length, type: 'result' }));
    const activeMarkers = flags.searchMode === 'smart' ? annotations : highlights;
    const sortedMarkers = [...activeMarkers].sort((a, b) => a.start - b.start);
    
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedMarkers.forEach((m, i) => {
      if (m.start < lastIndex) return;
      parts.push(sourceText.slice(lastIndex, m.start));
      
      let className = "rounded px-0.5 transition-all duration-200 ";
      if ('type' in m) {
        if (m.type === 'match') className += "bg-emerald-500/30 border-b-2 border-emerald-400 text-emerald-50";
        else if (m.type === 'context') className += "bg-rose-500/30 border-b-2 border-rose-400 text-rose-50";
      } else {
        className += "highlight-match";
      }

      parts.push(
        <span key={i} className={className}>
          {sourceText.slice(m.start, m.end)}
        </span>
      );
      lastIndex = m.end;
    });
    
    parts.push(sourceText.slice(lastIndex));
    return parts;
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const copyAllCode = () => {
    if (!result) return;
    const combined = Object.entries(result.codeSnippets)
      .map(([lang, code]) => `// ${lang.toUpperCase()}\n${code}`)
      .join('\n\n');
    copyToClipboard(combined, 'all');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f1a] text-slate-200 selection:bg-indigo-500/30">
      <header className="bg-slate-900/90 border-b border-white/5 p-4 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-white">RegEx Smart <span className="text-indigo-400">Builder</span></h1>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">Algorithmic Pattern Studio</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowHelp(true)}
              className="p-2 text-slate-400 hover:text-white transition-colors"
              title="Open Detailed Help Guide"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 bg-slate-800/40 p-1 rounded-xl border border-white/5">
              <button 
                onClick={() => setBrush('green')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${brush === 'green' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                title="Green Brush: Mark text to extract (Capturing)"
              >
                <Paintbrush className="w-3.5 h-3.5" /> <span className="hidden md:inline">Match</span>
              </button>
              <button 
                onClick={() => setBrush('red')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${brush === 'red' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                title="Red Brush: Mark anchor text (Lookarounds)"
              >
                <Paintbrush className="w-3.5 h-3.5" /> <span className="hidden md:inline">Context</span>
              </button>
              <div className="w-px h-4 bg-white/10 mx-1"></div>
              <button 
                onClick={() => setBrush('eraser')}
                className={`p-2 rounded-lg transition-all ${brush === 'eraser' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                title="Eraser: Remove marks from the sandbox"
              >
                <Eraser className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                <HelpCircle className="w-5 h-5 text-indigo-400" /> Advanced Mode Guide
              </h2>
              <button onClick={() => setShowHelp(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h3 className="text-indigo-400 font-bold flex items-center gap-2 text-sm">Literal Mode</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">Exact text matching. Enabling "Whole Words Only" adds \b boundaries to prevent partial word matches.</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-emerald-400 font-bold flex items-center gap-2 text-sm">Between Mode</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">Captures everything between two strings. Useful for parsing HTML attributes, bracketed content, or quoted strings.</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-rose-400 font-bold flex items-center gap-2 text-sm">Two Words (Gap)</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">Finds instances where Word A is followed by Word B later in the text, capturing everything from start to finish.</p>
                </div>
                <div className="space-y-4">
                  <h3 className="text-indigo-400 font-bold flex items-center gap-2 text-sm">Smart Mode (Annotation)</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-bold">The most powerful feature of this builder.</p>
                  <ul className="space-y-3 text-xs text-slate-400">
                    <li className="flex gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0"></span>
                      <span><b>Green (Match):</b> Marks text you want to extract. This creates a capturing group <code>(...)</code> in the regex.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1 flex-shrink-0"></span>
                      <span><b>Red (Context):</b> Marks text that must be present near your match but shouldn't be extracted. 
                      If painted <i>before</i> a green mark, it creates a <b>Positive Lookbehind</b> <code>(?&lt;=...)</code>. 
                      If painted <i>after</i>, it creates a <b>Positive Lookahead</b> <code>(?=...)</code>.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1 flex-shrink-0"></span>
                      <span><b>Eraser:</b> Select the eraser and highlight any existing color to remove the instruction from the pattern engine.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-slate-900/60 rounded-3xl p-6 border border-white/5 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <h2 className="text-lg font-bold flex items-center gap-2 text-indigo-400">
                <Search className="w-5 h-5" /> Search Method
              </h2>
              <div className="flex p-1 bg-slate-950 rounded-xl border border-white/5 overflow-x-auto scrollbar-none">
                {['literal', 'between', 'gap', 'smart'].map((m) => (
                  <button 
                    key={m}
                    onClick={() => setFlags(f => ({...f, searchMode: m as any}))}
                    className={`px-4 py-2 rounded-lg text-[11px] font-black transition-all capitalize uppercase tracking-tighter whitespace-nowrap ${flags.searchMode === m ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {m === 'gap' ? 'Two Words' : m}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {flags.searchMode === 'literal' && (
                <div className="relative">
                  <input
                    type="text"
                    value={targetText}
                    onChange={(e) => setTargetText(e.target.value)}
                    placeholder="Exact text to search for..."
                    className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-6 py-5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xl font-medium"
                  />
                </div>
              )}

              {flags.searchMode === 'between' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Start Anchor</label>
                    <input
                      type="text"
                      value={flags.startWord}
                      onChange={(e) => setFlags(f => ({...f, startWord: e.target.value}))}
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">End Anchor</label>
                    <input
                      type="text"
                      value={flags.endWord}
                      onChange={(e) => setFlags(f => ({...f, endWord: e.target.value}))}
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {flags.searchMode === 'gap' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">First Word</label>
                    <input
                      type="text"
                      value={flags.wordA}
                      onChange={(e) => setFlags(f => ({...f, wordA: e.target.value}))}
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Second Word</label>
                    <input
                      type="text"
                      value={flags.wordB}
                      onChange={(e) => setFlags(f => ({...f, wordB: e.target.value}))}
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="relative pt-4">
                <div className="flex items-center justify-between mb-3 px-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Visualizer & Annotator</label>
                  {flags.searchMode === 'smart' && (
                    <button 
                      onClick={() => setAnnotations([])}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-400 transition-colors uppercase"
                    >
                      Clear Marks
                    </button>
                  )}
                </div>
                <div 
                  ref={sandboxRef}
                  onMouseUp={handleSelection}
                  className={`w-full bg-slate-950 border border-white/5 rounded-3xl px-8 py-8 min-h-[160px] mono text-base leading-relaxed outline-none transition-all shadow-inner ${brush !== 'eraser' ? 'cursor-crosshair' : 'cursor-pointer hover:bg-slate-900/50'}`}
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                >
                  {renderAnnotatedText()}
                </div>
                <div className="absolute right-6 bottom-6 flex gap-2">
                  <div className="px-4 py-1.5 bg-indigo-600/20 rounded-full text-[10px] text-indigo-300 font-black border border-indigo-500/20 backdrop-blur-md">
                    {matches.length} matches
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Testing Sandbox</label>
                  <Microscope className="w-4 h-4 text-indigo-500/50" />
                </div>
                <textarea
                  value={sourceText}
                  onChange={(e) => {
                    setSourceText(e.target.value);
                    if (flags.searchMode === 'smart') setAnnotations([]);
                  }}
                  placeholder="Paste your source text here to preview the search result..."
                  className="w-full bg-slate-950 border border-white/5 rounded-3xl px-6 py-4 min-h-[120px] text-sm text-slate-400 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none shadow-lg"
                />
                <div className="mt-4 px-2">
                   <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase mb-3">
                     <List className="w-3 h-3" /> Captured Results
                   </h4>
                   <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto scrollbar-none">
                     {matches.length > 0 ? matches.map((m, idx) => (
                       <div key={idx} className="bg-slate-900 border border-white/5 px-3 py-2 rounded-xl text-xs flex gap-3 items-center">
                         <span className="text-[10px] font-bold text-slate-600 mono">#{idx + 1}</span>
                         <span className="text-emerald-400 mono font-medium">"{m.text}"</span>
                         <span className="text-[10px] text-slate-700">pos: {m.index}</span>
                       </div>
                     )) : (
                       <span className="text-[10px] text-slate-700 italic">No matches currently found in sandbox text...</span>
                     )}
                   </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-slate-900/40 rounded-3xl p-6 border border-white/5">
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { id: 'ignoreCase', label: 'Ignore Case', title: 'Matches text regardless of uppercase/lowercase (i flag)' },
                  { id: 'global', label: 'Match All', title: 'Finds all matches in the text rather than just the first (g flag)' },
                  { id: 'multiline', label: 'Multi-line', title: 'Treats beginning and end characters (^ and $) as working across multiple lines (m flag)' },
                  { id: 'wholeWord', label: 'Whole Word', title: 'Ensures the pattern only matches when it is a standalone word (adds \\b boundaries)', disabled: flags.searchMode !== 'literal' }
                ].map((f) => (
                  <button 
                    key={f.id}
                    disabled={f.disabled}
                    title={f.title}
                    onClick={() => setFlags(prev => ({...prev, [f.id]: !prev[f.id as keyof RegExFlags]}))}
                    className={`p-4 rounded-2xl border text-[10px] font-black uppercase tracking-tighter transition-all ${flags[f.id as keyof RegExFlags] ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-lg shadow-indigo-500/10' : 'bg-slate-950 border-white/5 text-slate-600 hover:border-white/10'} disabled:opacity-20`}
                  >
                    {f.label}
                  </button>
                ))}
             </div>
          </section>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <section className="bg-gradient-to-br from-slate-900 to-[#080b14] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-6 bg-white/5 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xs font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                <Terminal className="w-4 h-4" /> Generated Pattern
              </h2>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-black/40 p-6 rounded-3xl border border-white/5 relative group overflow-hidden">
                 <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                 <div className="relative z-10 text-indigo-400 font-bold mono text-xl break-all leading-snug tracking-tight">
                   <span className="text-slate-700 mr-1">/</span>
                   {regexPattern || '(?:...)'}
                   <span className="text-slate-700 mx-1">/</span>
                   <span className="text-slate-500 text-sm italic">
                     {(flags.global ? 'g' : '') + (flags.ignoreCase ? 'i' : '') + (flags.multiline ? 'm' : '')}
                   </span>
                 </div>
                 <button 
                  onClick={() => copyToClipboard(regexPattern, 'pattern')}
                  className="absolute right-4 top-4 p-2 bg-slate-800/90 hover:bg-slate-700 rounded-xl text-slate-400 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-md"
                 >
                   {copiedType === 'pattern' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                 </button>
              </div>
              
              {result && (
                <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-5 flex gap-4">
                  <Info className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-indigo-300/80 leading-relaxed font-medium">
                    {result.explanation}
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="bg-slate-900/40 rounded-[2.5rem] border border-white/5 shadow-xl">
             <div className="p-6 border-b border-white/5 flex items-center justify-between">
               <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Implementation Code</h3>
               {result && (
                 <button 
                  onClick={copyAllCode}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-black text-slate-400 transition-all border border-white/5 uppercase"
                 >
                   {copiedType === 'all' ? <ClipboardCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                   {copiedType === 'all' ? 'Copied All' : 'Copy All'}
                 </button>
               )}
             </div>
             <div className="p-6 space-y-6">
               {result ? (
                 Object.entries(result.codeSnippets).map(([lang, code]) => (
                    <div key={lang} className="space-y-3">
                      <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase bg-black/40 px-3 py-1 rounded-full border border-white/5 tracking-wider">{lang}</span>
                        <button 
                          onClick={() => copyToClipboard(code, lang)}
                          className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          {copiedType === lang ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <pre className="bg-black/60 p-5 rounded-2xl text-[11px] mono text-slate-400 overflow-x-auto border border-white/5 leading-relaxed scrollbar-none">
                        <code 
                          className={`language-${lang === 'javascript' ? 'js' : lang}`}
                          dangerouslySetInnerHTML={{ 
                            __html: hljs.highlight(code, { language: lang === 'javascript' ? 'js' : lang }).value 
                          }}
                        />
                      </pre>
                    </div>
                 ))
               ) : (
                 <div className="text-center py-16 text-slate-700 text-sm italic font-medium">
                   Enter search parameters to generate code
                 </div>
               )}
             </div>
          </section>
        </div>
      </main>

      <footer className="bg-slate-950/90 border-t border-white/5 p-8 text-center backdrop-blur-2xl">
        <div className="flex flex-wrap justify-center gap-8 mb-6">
           <div className="flex items-center gap-2 text-[10px] text-emerald-500/60 font-black uppercase tracking-widest"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></div> Results List Active</div>
           <div className="flex items-center gap-2 text-[10px] text-slate-500/60 font-black uppercase tracking-widest"><div className="w-2 h-2 rounded-full bg-slate-500"></div> Syntax Highlighting</div>
        </div>
        <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.4em] opacity-50">RegEx Pro Builder &bull; Ver 2.8</p>
      </footer>
    </div>
  );
};

export default App;
