import { AnimatePresence, motion } from 'framer-motion';

interface CustomDialogProps {
  isOpen: boolean;
  type: 'alert' | 'confirm';
  title: string;
  message: string;
  onConfirm?: () => void;
  onClose: () => void;
}

export default function CustomDialog({
  isOpen,
  type,
  title,
  message,
  onConfirm,
  onClose,
}: CustomDialogProps) {
  function handleConfirm() {
    onConfirm?.();
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={type === 'alert' ? onClose : undefined}
        >
          <motion.div
            className="bg-white rounded-[2.5rem] max-w-sm w-full p-8 shadow-2xl flex flex-col items-center text-center"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${
                type === 'alert' ? 'bg-amber-100' : 'bg-slate-100'
              }`}
            >
              {type === 'alert' ? '⚠️' : '❓'}
            </div>

            <h2 className="text-2xl font-black text-slate-800 mt-4">{title}</h2>
            <p className="text-slate-500 font-medium mt-2 mb-6">{message}</p>

            {type === 'alert' ? (
              <button
                onClick={onClose}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl transition-colors"
              >
                OK
              </button>
            ) : (
              <div className="flex gap-3 w-full">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 border-2 border-slate-200 hover:border-slate-300 text-slate-600 font-black rounded-2xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl transition-colors"
                >
                  Confirm
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
