import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import path from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/index.ts'),
            name: 'kakidash',
            fileName: (format) => `kakidash.${format}.js`
        },
        rollupOptions: {
            external: [], // 外部依存があればここに追加
            output: {
                globals: {}
            }
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    plugins: [
        dts({
            insertTypesEntry: true,
        })
    ]
});
