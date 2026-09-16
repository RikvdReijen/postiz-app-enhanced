import { FC, ReactNode, TextareaHTMLAttributes, InputHTMLAttributes } from 'react';

const cx = (...classes: (string | false | undefined)[]) =>
  classes.filter(Boolean).join(' ');

export const Button: FC<{
  children: ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}> = ({ children, onClick, secondary, disabled, loading, className }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || loading}
    className={cx(
      'h-[44px] px-[16px] rounded-[8px] text-[15px] font-[600] transition-opacity disabled:opacity-50',
      secondary
        ? 'bg-btnSimple text-newTextColor'
        : 'bg-btnPrimary text-white',
      className
    )}
  >
    {loading ? '…' : children}
  </button>
);

export const Card: FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={cx(
      'bg-newBgColorInner rounded-[12px] p-[16px] flex flex-col gap-[12px] min-w-0',
      className
    )}
  >
    {children}
  </div>
);

export const Field: FC<{ label: string; children: ReactNode }> = ({
  label,
  children,
}) => (
  <label className="flex flex-col gap-[6px] min-w-0">
    <span className="text-[13px] text-textItemBlur">{label}</span>
    {children}
  </label>
);

const controlClasses =
  'bg-newBgLineColor border border-newBorder rounded-[8px] px-[12px] py-[10px] text-[15px] text-newTextColor outline-none w-full min-w-0 box-border';

export const TextInput: FC<InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input {...props} className={cx(controlClasses, props.className)} />
);

export const TextArea: FC<TextareaHTMLAttributes<HTMLTextAreaElement>> = (
  props
) => <textarea {...props} className={cx(controlClasses, props.className)} />;

export const Toggle: FC<{
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
}> = ({ label, checked, onChange, hint }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="flex items-center justify-between gap-[12px] text-start"
  >
    <span className="flex flex-col">
      <span className="text-[15px]">{label}</span>
      {!!hint && <span className="text-[12px] text-textItemBlur">{hint}</span>}
    </span>
    <span
      className={cx(
        'w-[44px] h-[26px] rounded-full shrink-0 relative transition-colors',
        checked ? 'bg-btnPrimary' : 'bg-btnSimple'
      )}
    >
      <span
        className={cx(
          'absolute top-[3px] w-[20px] h-[20px] rounded-full bg-white transition-all',
          checked ? 'start-[21px]' : 'start-[3px]'
        )}
      />
    </span>
  </button>
);

export const StatusDot: FC<{ state: 'online' | 'degraded' | 'offline' }> = ({
  state,
}) => (
  <span
    className={cx(
      'w-[10px] h-[10px] rounded-full inline-block shrink-0',
      state === 'online' && 'bg-[#3c7c5a]',
      state === 'degraded' && 'bg-[#fcba03]',
      state === 'offline' && 'bg-ai'
    )}
  />
);
