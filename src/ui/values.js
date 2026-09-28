// Listas de valores que usan varios menús (en un módulo aparte para evitar imports circulares).
import { DIFFICULTIES, DIFF_ORDER } from '../config.js';

export const yesNo = [{ v: true, label: 'SÍ' }, { v: false, label: 'NO' }];
export const diffValues = DIFF_ORDER.map((d) => ({ v: d, label: DIFFICULTIES[d].label }));
export const pointValues = [5, 10, 15].map((n) => ({ v: n, label: String(n) }));
