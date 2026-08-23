# Aplicación Web para el Entrenamiento Auditivo

Esta aplicación es una herramienta interactiva diseñada para ayudar a músicos y estudiantes a mejorar sus habilidades auditivas a través de diversos ejercicios y pruebas personalizables.

## Funcionalidades Principales

La aplicación ofrece varios modos de entrenamiento, cada uno enfocado en un aspecto específico del oído musical:

- **Intervalos**: Identificación de intervalos musicales (ascendentes, descendentes y armónicos).
- **Acordes**: Reconocimiento de diferentes tipos de acordes (mayores, menores, aumentados, disminuidos, etc.) y sus inversiones.
- **Escalas**: Identificación de escalas (mayor, menor natural/armónica/melódica, pentatónicas y modos griegos).
- **Grados de la Escala**: Reconocimiento de los grados específicos dentro del contexto de una escala.
- **Canto**: Ejercicios prácticos que utilizan el micrófono para verificar la afinación al cantar notas o intervalos.
- **Oído Absoluto**: Entrenamiento para identificar notas específicas sin referencia tonal.

### Características Adicionales

- **Personalización**: Cada quiz es altamente configurable, permitiendo seleccionar qué elementos específicos se desean practicar (por ejemplo, elegir solo ciertos intervalos o tipos de acordes).
- **Resultados y Estadísticas**: Al finalizar cada sesión, se muestra un resumen detallado con el puntaje, estadísticas de aciertos/errores y un historial de las respuestas dadas.
- **Interfaz Intuitiva**: Diseño limpio y fácil de usar para una experiencia de aprendizaje fluida.

## Tecnologías Utilizadas

Este proyecto está construido con tecnologías web modernas:

- **[React Router v7](https://reactrouter.com/)**: Para el enrutamiento y la estructura de la aplicación.
- **[React 19](https://react.dev/)**: Biblioteca de interfaz de usuario.
- **[Tone.js](https://tonejs.github.io/)**: Framework de audio web para la síntesis y reproducción de sonidos.
- **[Tonal](https://github.com/tonaljs/tonal)**: Biblioteca de teoría musical para la generación y manipulación de notas, intervalos y acordes.
- **[Pitchfinder](https://github.com/peterkhayes/pitchfinder)**: Algoritmos de detección de tono para los ejercicios de canto.
- **[Tailwind CSS](https://tailwindcss.com/)**: Framework de utilidades CSS para el diseño visual.

## Instalación y Uso

Para ejecutar este proyecto localmente, asegúrate de tener [Node.js](https://nodejs.org/) instalado.

1.  Clona el repositorio o descarga los archivos.
2.  Instala las dependencias:

    ```bash
    npm install
    ```

3.  Inicia el servidor de desarrollo:

    ```bash
    npm run dev
    ```

4.  Abre tu navegador en la dirección que se muestra en la terminal (generalmente `http://localhost:5173`).

## Autor

Desarrollado por **Salomón Leon** para el proyecto de práctica profesional.
