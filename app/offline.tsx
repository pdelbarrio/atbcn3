import { FaWifi } from 'react-icons/fa';

export default function Offline() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <div className="mb-6 text-red-500">
        <FaWifi size={64} />
      </div>
      <h1 className="text-3xl font-bold mb-4">Sense connexió</h1>
      <p className="text-lg mb-6">
        Sembla que no tens connexió a Internet. Comprova la teva connexió i torna-ho a provar.
      </p>
      <button 
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Recarregar
      </button>
    </div>
  );
}