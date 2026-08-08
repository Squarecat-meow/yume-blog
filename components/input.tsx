interface IInputProps {
  type: string;
  placeholder?: string;
  defaultValue?: string;
  autoComplete?: 'on' | 'off';
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function Input({
  type,
  placeholder,
  defaultValue,
  autoComplete = 'off',
  onChange,
}: IInputProps) {
  return (
    <input
      type={type}
      className="p-1 border border-slate-300 rounded-lg placeholder:text-slate-300"
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
      defaultValue={defaultValue}
    />
  );
}
