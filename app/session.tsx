'use client';
import Link from 'next/link';
import {createContext, useCallback, useContext, useState} from 'react';
import {api, errorText, User} from '../lib/api';
type Session = {token:string; user:User|null; signIn:(token:string,user:User)=>void; expire:()=>void};
const Context = createContext<Session>({token:'',user:null,signIn:()=>{},expire:()=>{}});
export const useSession = ()=>useContext(Context);
export default function SessionProvider({children}:{children:React.ReactNode}) {
  const [token,setToken]=useState('');const [user,setUser]=useState<User|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const expire=useCallback(()=>{setToken('');setUser(null);},[]);
  async function logout(){setBusy(true);setError('');try{await api('/auth/logout',token,{method:'POST'});expire();}catch(e){setError(errorText(e));}finally{setBusy(false);}}
  return <Context.Provider value={{token,user,expire,signIn:(t,u)=>{setToken(t);setUser(u);}}}><header><Link href="/" className="identity"><img src="/hl-logo.png" alt="HyperLine" width="44" height="44"/><span>HYPERLINE</span></Link><nav><Link href="/">Home</Link><Link href="/movies">Movies & search</Link>{user?<><span className="muted">{user.name}</span><button className="secondary" disabled={busy} onClick={logout}>Sign out</button></>:<Link className="button" href="/login">Sign in</Link>}</nav></header>{error&&<p role="alert" className="error">{error}</p>}{children}<footer>HYPERLINE OTT · Your next story starts here.</footer></Context.Provider>;
}
