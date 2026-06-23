## Problema
No `RadarSweep` (src/components/ops/motion-bits.tsx, ~linha 167) o container externo é um `div` retangular sem clipping. O "sweep cone" (linhas 208–220) é um quadrado `(center-4) × (center-4)` com `conic-gradient` rotacionando a partir do canto — a "sombra"/cone gira para fora do círculo do radar, aparecendo como um vermelhão voando no nada (visível no canto superior-esquerdo do print).

O feixe linear (linhas 194–206) também projeta `drop-shadow` que vaza para fora do disco.

## Correção (pontual, só visual)

1. **Clipar o radar num círculo**: trocar
   ```tsx
   <div className="relative" style={{ width: size, height: size }}>
   ```
   por
   ```tsx
   <div className="relative overflow-hidden rounded-full" style={{ width: size, height: size }}>
   ```
   Isso confina o sweep, o cone e o drop-shadow ao disco — fim da sombra voando.

2. **Reduzir intensidade do cone** para não criar uma borda dura no recorte: baixar a opacidade da conic-gradient de `22%` → `14%` e o spread de `60deg` → `55deg`.

3. **Reposicionar blips fora do clip**: como os blips ficam dentro do raio `(center-14)`, continuam visíveis sem alteração. O halo de pulso (`scale [1,3]`) de blips próximos da borda pode ser cortado — ok, é o comportamento desejado de radar real.

## Fora de escopo
Nada de mudança em layout, paleta, outras telas, lógica ou mocks.

## Arquivo
- `src/components/ops/motion-bits.tsx` — apenas o componente `RadarSweep`.