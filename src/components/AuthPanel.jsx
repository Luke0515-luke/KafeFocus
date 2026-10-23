import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AuthPanel() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name.trim() || undefined } },
        });
        if (error) throw error;
        if (!data.session) setMsg("註冊成功，請到信箱點擊驗證連結後再登入。");
      }
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  const input = "w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm outline-none focus:border-amber-500";

  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-stone-800 p-6 shadow-xl">
        <h1 className="text-2xl font-semibold">KafeFocus</h1>
        <p className="text-sm text-stone-400">登入後選一個位子，和大家一起專注讀書。</p>

        {mode === "signup" && (
          <input className={input} placeholder="顯示名稱" maxLength={24} value={name} onChange={(e) => setName(e.target.value)} />
        )}
        <input className={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={input} type="password" placeholder="密碼（至少 6 碼）" value={password} onChange={(e) => setPassword(e.target.value)} />

        {msg && <p className="text-sm text-amber-400">{msg}</p>}

        <button
          onClick={submit}
          disabled={busy || !email || password.length < 6}
          className="w-full rounded-lg bg-amber-600 py-2 font-medium text-white hover:bg-amber-500 disabled:opacity-50"
        >
          {mode === "signin" ? "登入" : "建立帳號"}
        </button>
        <button
          onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMsg(null); }}
          className="w-full text-sm text-stone-400 hover:text-stone-200"
        >
          {mode === "signin" ? "還沒有帳號？註冊" : "已有帳號？登入"}
        </button>
      </div>
    </div>
  );
}
