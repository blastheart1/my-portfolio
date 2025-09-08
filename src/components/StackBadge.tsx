interface StackBadgeProps {
  name: string;
}

export default function StackBadge({ name }: StackBadgeProps) {
  return (
    <span className="
      px-3 py-1 
      bg-gray-200 text-[#0033A0] 
      dark:bg-gray-700 dark:text-white
      rounded-full text-sm font-medium 
      transition hover:bg-gray-300 dark:hover:bg-gray-600
    ">
      {name}
    </span>
  );
}
