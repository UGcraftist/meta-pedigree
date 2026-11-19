import { useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/AuthProvider';

export function LoginScreen() {
  const { signIn, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    await signIn(email, password);
    setBusy(false);
  }

  return (
    <main className="login">
      <h1>Meta Pedigree</h1>
      <p className="muted">内部预览：登录编辑账号后可查看谱系树。</p>
      <form onSubmit={submit}>
        <label>
          邮箱
          <input type="email" value={email} autoComplete="username" required
                 onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          密码
          <input type="password" value={password} autoComplete="current-password" required
                 onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? '登录中…' : '登录'}</button>
      </form>
    </main>
  );
}
