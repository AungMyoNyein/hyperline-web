import Player from './player';
export default async function Watch({searchParams}:{searchParams:Promise<{id?:string}>}){return <main><p className="eyebrow">NOW SHOWING</p><h1>HyperLine player</h1><Player id={(await searchParams).id||''}/></main>;}
