export default function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className='text-xs text-slate-400 rounded bg-sky-100 p-0.5'>
      #{children}
    </span>
  );
}
