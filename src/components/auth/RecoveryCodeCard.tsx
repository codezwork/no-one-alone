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
    const text = `No One Alone - Account Recovery Code\n\nName: ${userName}\nRecovery Code: ${code}\n\nKeep this code safe. No One Alone does not use passwords or emails. Use this recovery code to sign in on any device.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `no-one-alone-recovery-code-${userName.toLowerCase().replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-card p-5 space-y-3.5 border-black/15 dark:border-white/20 shadow-xl">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-black dark:bg-white text-white dark:text-black">
          <KeyRound size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-[var(--ink)]">Save your Recovery Key</h3>
          <p className="mt-0.5 text-xs text-[var(--muted)] leading-relaxed">
            There are no email or passwords. This code is your only key to sign in as <strong>{userName}</strong> on another phone or browser.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] px-4 py-3 font-mono text-xs sm:text-sm tracking-wide text-[var(--ink)] shadow-inner">
        <span className="select-all break-all font-bold">{code}</span>
        <button
          onClick={handleCopy}
          className="ml-2 btn-pill btn-pill-secondary py-1 px-3 min-h-[30px] text-xs font-bold shrink-0"
        >
          {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <button
          onClick={handleDownload}
          className="btn-pill btn-pill-secondary flex-1 py-2 text-xs font-semibold"
        >
          <Download size={14} />
          <span>Save Backup (.txt)</span>
        </button>
        <button
          onClick={onDismiss}
          className="btn-pill btn-pill-primary flex-1 py-2 text-xs font-bold shadow-md"
        >
          <ShieldCheck size={15} />
          <span>I Saved My Code</span>
        </button>
      </div>
    </div>
  );
}
