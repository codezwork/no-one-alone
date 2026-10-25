'use client';
import React, { useState } from 'react';
import { KeyRound, Copy, Check, Download, ShieldCheck } from 'lucide-react';

interface RecoveryCodeCardProps {
  code: string;
  userName: string;
  onDismiss: () => void;
}

export function RecoveryCodeCard({ code, userName, onDismiss }: RecoveryCodeCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleDownload = () => {
    const text = `Neighbours by No One Alone - Account Recovery Code\n\nName: ${userName}\nRecovery Code: ${code}\n\nKeep this code safe. Neighbours does not use passwords or emails. Use this recovery code to sign in on any device.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neighbours-recovery-code-${userName.toLowerCase().replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-slate-900/90 p-5 shadow-xl">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-amber-500/20 p-2.5 text-amber-400">
          <KeyRound size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-white">Save your Recovery Code</h3>
          <p className="mt-0.5 text-xs text-amber-200/80 leading-relaxed">
            There are no email or Google logins. This 16-character code is your only key to sign in as <strong>{userName}</strong> on another phone or browser.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-500/30 bg-black/60 px-4 py-3 font-mono text-sm tracking-wide text-amber-300">
        <span className="select-all break-all">{code}</span>
        <button
          onClick={handleCopy}
          className="ml-2 flex items-center gap-1 rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/30"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <button
          onClick={handleDownload}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
        >
          <Download size={14} />
          <span>Save Backup (.txt)</span>
        </button>
        <button
          onClick={onDismiss}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-400 transition-colors"
        >
          <ShieldCheck size={15} />
          <span>I saved my code</span>
        </button>
      </div>
    </div>
  );
}
