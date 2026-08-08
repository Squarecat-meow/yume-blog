interface IButtonProps {
  text: string;
  type?: 'button' | 'submit';
  className?: string;
}
export default function Button({
  text,
  className,
  type = 'button',
}: IButtonProps) {
  return (
    <button
      className={`px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 ${className}`}
      type={type}
    >
      {text}
    </button>
  );
}
