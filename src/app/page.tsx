import Link from 'next/link';
import { CATEGORY_ORDER, catalog, caseLite, picks } from '@/lib/catalog';
import { rubF } from '@/lib/types';
import { CardSizeToggle } from '@/components/CardSize';

const slug = (s: string) => s.toLowerCase().replace(/[^a-zа-я0-9]+/gi, '-');

export default function Home() {
  const lite = catalog.cases.map(caseLite);
  const groups = CATEGORY_ORDER.filter(c => lite.some(l => l.category === c)).map(c => ({ name: c, cases: lite.filter(l => l.category === c) }));
  for (const l of lite) if (!CATEGORY_ORDER.includes(l.category)) { const g = groups.find(x => x.name === l.category); if (g) g.cases.push(l); else groups.push({ name: l.category, cases: [l] }); }
  const skins = catalog.items.filter(i => i.type === 'weapon' || i.type === 'knife' || i.type === 'gloves').length;
  return (
    <>
      <section className="catalog-intro">
        <div>
          <span className="eyebrow">YOUR DROP / КОЛЛЕКЦИИ</span>
          <h1>Открывай <span>своё.</span></h1>
          <p>От первого скина до редкого ножа.<br />Выбирай кейс и собирай свою коллекцию.</p>
          <div className="catalog-counts"><span><b>{catalog.cases.length}</b> кейсов</span><span><b>{skins.toLocaleString('ru-RU')}</b> скинов</span><span>до <b>10</b> открытий за раз</span></div>
        </div>
        <Link href={'/case/' + lite[0].id} className="intro-case"><div><span className="eyebrow">НАЧАТЬ КОЛЛЕКЦИЮ</span><h2>{lite[0].name}</h2><b>{rubF(lite[0].price)} <span aria-hidden="true">↗</span></b></div><img src={lite[0].image} alt="" /></Link>
      </section>

      <nav className="cats" aria-label="Категории">
        <a href="#podborki">Подборки</a>
        {groups.map(g => <a key={g.name} href={`#${slug(g.name)}`}>{g.name}</a>)}
      </nav>

      <section id="podborki" className="picks section">
        <div className="picks-head"><div><h2>Тематические подборки</h2><p>Готовые маршруты по каталогу: цена, любимое оружие, красные предметы или охота за ножом.</p></div><CardSizeToggle /></div>
        {picks.map(p => (
          <div key={p.id} className="pick-row">
            <div className="pick-head"><h3>{p.title}</h3><span>{p.description}</span></div>
            <div className="pick-scroll">
              {p.cases.map(c => (
                <Link key={c.id} href={`/case/${c.id}`} className="case-card">
                  <img src={c.image} alt="" loading="lazy" />
                  <div className="name">{c.name}</div>
                  <div className={`price${c.currency === 'BCN' ? ' bcn' : ''}`}>{c.currency === 'BCN' ? `${c.price} BCN` : rubF(c.price)}</div>
                  <span className="why">{c.why}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      {groups.map(g => (
        <section key={g.name} id={slug(g.name)} className="section">
          <h2>{g.name} <span>{g.cases.length}</span></h2>
          <div className="case-grid">
            {g.cases.map(c => (
              <Link key={c.id} href={`/case/${c.id}`} className="case-card">
                <img src={c.image} alt="" loading="lazy" />
                <div className="name">{c.name}</div>
                <div className={`price${c.currency === 'BCN' ? ' bcn' : ''}`}>{c.currency === 'BCN' ? `${c.price} BCN` : rubF(c.price)}</div>
                <span className="case-card-meta">{c.count} предметов <span aria-hidden="true">↗</span></span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
