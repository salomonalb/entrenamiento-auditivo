export function Footer() {
  return (
    <footer className="w-full py-4 mt-auto border-t border-gray-800/50 bg-gray-950/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div className="space-y-2">
            <p className="text-sm text-gray-400">
              Desarrollado por{" "}
              <span className="font-semibold text-gray-200">Salomón León</span>
            </p>
            <p className="text-xs text-gray-500">
              Para el proyecto de práctica profesional "Aplicación Web para el
              Entrenamiento Auditivo" ( 2025 ).
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-2">
            <a
              href="mailto:salomonleon197@gmail.com"
              className="text-sm text-gray-400 hover:text-blue-400 transition-colors duration-200"
            >
              contacto: salomonleon197@gmail.com
            </a>

            <a
              href="https://github.com/salomonalb/ear-training"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors duration-200 p-2 hover:bg-gray-800 rounded-full"
              aria-label="GitHub Repository"
            >
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
