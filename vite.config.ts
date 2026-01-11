/// <reference types="vitest" />
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import path from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/index.ts'),
            name: 'kakidash',
            fileName: (format) => {
                if (format === 'es') return 'kakidash.es.js';
                if (format === 'umd') return 'kakidash.umd.js';
                return `kakidash.${format}`; // cjs -> kakidash.cjs
            },
            formats: ['es', 'umd', 'cjs']
        },
        rollupOptions: {
            external: [], // 外部依存があればここに追加
            output: {
                globals: {},
                exports: 'named'
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
            include: ['src'],
            rollupTypes: true,
        })
    ],
    test: {
        environment: 'happy-dom',
        globals: true,
        setupFiles: ['./tests/setup.ts']
    }
});
