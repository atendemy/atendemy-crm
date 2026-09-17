---
impacto: nada_mudou
secao: corrigido
titulo: Exibição da razão registrada ao suspender um tenant
---

Ao suspender um tenant informando um motivo, a tela de detalhes exibia "Sem razão registrada." porque a consulta da API omitia a coluna e a tela não a repassava ao banner. A consulta e o componente passam a buscar e exibir a razão registrada.
