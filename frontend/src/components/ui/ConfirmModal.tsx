import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title = 'Confirmer',
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="card p-6 w-full max-w-md">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div className={(danger ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600') + ' w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0'}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">{title}</h3>
              {message && <p className="text-sm text-gray-600 mt-1">{message}</p>}
            </div>
          </div>
          <button type="button" onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="btn btn-secondary btn-md">{cancelLabel}</button>
          <button type="button" onClick={onConfirm} className={(danger ? 'btn-danger' : 'btn-primary') + ' btn btn-md'}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
