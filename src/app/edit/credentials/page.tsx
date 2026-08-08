import CredentialsEditor from '@/components/admin/CredentialsEditor';

/**
 * /edit/credentials — provider API keys.
 *
 * Server component wrapper; the editor is a client component because it posts
 * and needs local draft state. Nothing is fetched here: the keys must not pass
 * through a server-rendered payload, so the status list is fetched client-side
 * from the admin API instead.
 */
export default function CredentialsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Credentials</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          API keys for the model providers behind the chatbot and the demos.
        </p>
      </div>

      <CredentialsEditor />
    </div>
  );
}
