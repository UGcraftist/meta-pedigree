import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { LoginScreen } from './features/auth/LoginScreen';
import { TreeScreen } from './features/tree/TreeScreen';
import { ApiError, fetchTree, type TreeData } from './lib/api';

function TreeLoader() {
  const [data, setData] = useState<TreeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchTree()
      .then((d) => { if (alive) setData(d); })
      .catch((e: unknown) => { if (alive) setError(e instanceof ApiError ? e.message : String(e)); });
    return () => { alive = false; };
  }, []);

  if (error) {
    return (
      <main className="panel error-panel">
        <h2>读取谱系失败</h2>
        <p className="error" role="alert">{error}</p>
        <p className="muted">常见原因：迁移未应用、网络不可达，或当前账号不是编辑。刷新可重试。</p>
      </main>
    );
  }
  if (!data) return <main className="panel"><p className="muted">载入谱系数据…</p></main>;
  if (data.nodes.length === 0) {
    return <main className="panel"><p className="muted">暂无可见的组织（seed 数据尚未导入？）。</p></main>;
  }
  return <TreeScreen data={data} />;
}

function Gate() {
  const { session, appUser, loading, error } = useAuth();
  if (loading) return <main className="panel"><p className="muted">检查登录状态…</p></main>;
  if (error && !session) return <main className="panel"><p className="error">{error}</p></main>;
  if (!session) return <LoginScreen />;
  if (!appUser) {
    return (
      <main className="panel">
        <h2>无访问权限</h2>
        <p className="muted">账号已登录，但未在 app_users 中登记为编辑（R1 访问门）。请联系管理员分配角色。</p>
        <p className="muted">已登录：{session.user.email}</p>
      </main>
    );
  }
  return <TreeLoader />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
