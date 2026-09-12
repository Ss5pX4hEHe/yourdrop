export const ACHIEVEMENTS = [
  { id: 'first', name: 'Первый дроп', description: 'Получите первый предмет', badge: '01', reward: 'Аметистовая рамка' },
  { id: 'collector', name: 'Есть из чего выбрать', description: 'Получите 10 разных предметов', badge: '10', reward: 'Фон «Сияние»' },
  { id: 'upgrade', name: 'Выше планка', description: 'Совершите успешный апгрейд', badge: '↗', reward: 'Ледяная рамка' },
  { id: 'knife', name: 'На острие', description: 'Получите свой первый нож', badge: 'K', reward: 'Золотая рамка' },
  { id: 'album', name: 'Полный комплект', description: 'Завершите любую коллекцию', badge: '◆', reward: 'Фон «Туманность»' },
  { id: 'hundred', name: 'Сотня открытий', description: 'Откройте 100 кейсов', badge: '100', reward: 'Фон «Жар»' },
];
export const FRAMES = [{ id: 'plain', name: 'Графит', requires: '' }, { id: 'violet', name: 'Аметист', requires: 'first' }, { id: 'ice', name: 'Лёд', requires: 'upgrade' }, { id: 'gold', name: 'Золото', requires: 'knife' }, { id: 'emerald', name: 'Изумруд', requires: 'route:pistols' }, { id: 'crimson', name: 'Багрянец', requires: 'route:covert' }, { id: 'cyan', name: 'Неон', requires: 'route:blade' }];
export const BACKGROUNDS = [{ id: 'carbon', name: 'Карбон', requires: '' }, { id: 'aurora', name: 'Сияние', requires: 'collector' }, { id: 'nebula', name: 'Туманность', requires: 'album' }, { id: 'ember', name: 'Жар', requires: 'hundred' }, { id: 'sniper', name: 'Прицел', requires: 'route:sniper' }, { id: 'forge', name: 'Кузница', requires: 'route:rifles' }];
export const ROUTE_TITLES: Record<string, string> = { sniper: 'Путь снайпера', pistols: 'Карманный арсенал', rifles: 'Стальной ряд', covert: 'Красная линия', blade: 'Первый клинок' };
