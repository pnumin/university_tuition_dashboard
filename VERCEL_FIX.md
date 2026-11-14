# Vercel 배포 오류 수정

## 수정한 오류

기존 `tsconfig.node.json`에 다음 옵션이 있었습니다.

```json
"allowImportingTsExtensions": true
```

해당 옵션은 `noEmit`, `emitDeclarationOnly` 또는
`rewriteRelativeImportExtensions` 조건이 필요해 Vercel의 TypeScript 검사에서
`TS5096` 오류가 발생할 수 있습니다.

## 적용한 수정

- `tsconfig.node.json`에서 `allowImportingTsExtensions` 제거
- `tsconfig.node.json`에 `"noEmit": true` 명시
- 빌드 명령을 다음과 같이 변경

```json
"build": "tsc --noEmit -p tsconfig.app.json && vite build"
```

- `vercel.json` 추가

## Vercel 재배포

기존 프로젝트에 덮어쓴 뒤 다시 커밋하고 배포합니다.

```bash
npm install
npm run build
git add .
git commit -m "fix: resolve Vercel TypeScript build error"
git push
```

Vercel에서 이전 빌드 캐시가 영향을 주는 경우 **Redeploy** 화면에서
`Use existing Build Cache`를 해제한 뒤 다시 배포하세요.
