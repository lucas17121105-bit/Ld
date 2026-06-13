# LD vôlei app — PRD

## Visão Geral
App mobile (Expo / React Native) com painel web admin para treino de voleibol. Treinadores cadastram exercícios em vídeo (YouTube/Vimeo) e montam treinos personalizados; alunos acessam treinos do dia, biblioteca e progresso.

## Personas
- **Aluno**: Acessa via mobile, faz login Google, visualiza treino do dia, biblioteca por categoria, marca exercícios concluídos.
- **Treinador / Admin**: Acessa o painel via web (rota `/admin`), gerencia exercícios, alunos e treinos.

## Tecnologia
- Frontend: Expo SDK 54, expo-router, expo-image, react-native-webview (player YouTube/Vimeo)
- Backend: FastAPI + Motor (MongoDB)
- Auth: **Emergent-managed Google Auth** (token persistente em expo-secure-store no mobile, localStorage na web)
- Tema: azul claro (#E3F2FD) com texto preto

## Funcionalidades MVP
- [x] Login com Google (mobile + web)
- [x] Sessão persistente, cold-start handling
- [x] Bottom tabs: Treino do Dia, Biblioteca, Progresso, Perfil
- [x] Filtro horizontal por categoria (saque, manchete, toque, ataque, bloqueio, condicionamento)
- [x] Detalhe de exercício com player de vídeo (YouTube/Vimeo embed via WebView/iframe)
- [x] Marcar exercício como concluído → registra progresso
- [x] Tela de Progresso com métricas e histórico
- [x] Painel web admin (sidebar) em `/admin`: Dashboard, Alunos, Exercícios (CRUD), Treinos (CRUD com atribuição)
- [x] Promoção automática a admin: primeiro usuário cadastrado **ou** e-mails em `ADMIN_EMAILS`

## Próximos Passos
- Upload direto de vídeo (base64 → MongoDB) na tela de admin
- Notificações de novo treino
- Estatísticas avançadas (gráficos)
- Categorias customizáveis pelo admin
