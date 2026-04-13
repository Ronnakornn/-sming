import { TodoList } from "#/features/todo";

interface HomeAuthenticatedSectionProps {
  user: {
    name: string;
    email: string;
  };
}

export function HomeAuthenticatedSection({
  user,
}: HomeAuthenticatedSectionProps) {
  return (
    <div className="page-wrap px-4 pb-8 pt-14">
      <div className="island-shell rise-in mb-6 rounded-[2rem] px-6 py-6 sm:px-10">
        <p className="island-kicker mb-2">Welcome back</p>
        <h1 className="text-2xl font-bold text-[var(--sea-ink)]">
          {user.name}
        </h1>
        <p className="text-sm text-[var(--sea-ink-soft)]">{user.email}</p>
      </div>
      <TodoList />
    </div>
  );
}
