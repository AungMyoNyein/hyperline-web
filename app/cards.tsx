import Link from 'next/link';
import {Movie} from '../lib/api';
export function Cards({movies}:{movies:Movie[]}) {return <div className="grid">{movies.map(m=><Link className="card" href={`/movies/${encodeURIComponent(m.slug)}`} key={m.id}>{m.poster_url?<img src={m.poster_url} alt="" loading="lazy"/>:<div className="poster-placeholder">HL</div>}<div><h3>{m.title}</h3><p className="muted">{m.release_year||'Movie'}{m.duration_minutes?` · ${m.duration_minutes} min`:''}</p></div></Link>)}</div>;}
export function MovieRow({title,movies}:{title:string;movies:Movie[]}){return <section><div className="section-heading"><h2>{title}</h2><Link href="/movies">View all →</Link></div>{movies.length?<Cards movies={movies}/>:<p className="muted">No titles available yet.</p>}</section>;}
