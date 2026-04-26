import { TodoList } from "#/features/todo";
import { AdminPageIntro, AdminSpaceCat } from "#/features/admin";
import { requirePermission } from "#/lib/auth-server";

export default async function AdminTodoPage() {
  await requirePermission("admin.todos");

  return (
    <div className="flex flex-col gap-6">
      <AdminPageIntro
        eyebrow="Orbital Tasks"
        title="Your admin mission log"
        description="Keep your personal workstream close while staying inside the admin environment."
      >
        <AdminSpaceCat mode="todo" />
      </AdminPageIntro>
      <div className="admin-todo-scope">
        <TodoList />
      </div>
    </div>
  );
}
