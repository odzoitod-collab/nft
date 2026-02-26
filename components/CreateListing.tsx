import React, { useState, useRef } from 'react';
import { Upload, Sparkles, X, Image as ImageIcon } from 'lucide-react';
import Button from './Button';
import { generateNFTDescription } from '../services/geminiService';
import { NFT } from '../types';

interface CreateListingProps {
  onPublish: (nft: NFT) => void;
}

const CreateListing: React.FC<CreateListingProps> = ({ onPublish }) => {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAIAutoFill = async () => {
    if (!image) return;
    setIsGenerating(true);
    try {
      const result = await generateNFTDescription(image, title || "Untitled NFT");
      setDescription(result.description);
      // Optional: Could pre-fill price if empty, but usually user decides price.
      // We can show it as a hint.
      if(!price && result.priceEstimate !== '0') {
         // rough parsing if range "10-50" -> take avg or min
         const est = parseFloat(result.priceEstimate.split('-')[0]);
         if (!isNaN(est)) setPrice(est.toString());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price || !image) return;

    const newNFT: NFT = {
      id: Date.now().toString(),
      title,
      description,
      price: parseFloat(price),
      currency: 'TON',
      image,
      owner: 'ME',
      verified: false,
      views: 0,
      bids: 0
    };
    onPublish(newNFT);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 animate-fade-in">
      <h2 className="text-2xl font-bold mb-6">Новый листинг</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-tg-hint">Изображение NFT</label>
          <div 
            className={`
              relative border-2 border-dashed rounded-2xl h-64 flex flex-col items-center justify-center
              transition-colors cursor-pointer overflow-hidden
              ${image ? 'border-transparent bg-black' : 'border-gray-600 hover:border-blue-400 bg-tg-card'}
            `}
            onClick={() => !image && fileInputRef.current?.click()}
          >
            {image ? (
              <>
                <img src={image} alt="Preview" className="h-full w-full object-contain" />
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setImage(null); }}
                  className="absolute top-2 right-2 bg-black/70 p-1.5 rounded-full hover:bg-black/90 text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <ImageIcon className="w-10 h-10 text-tg-hint mb-3" />
                <p className="text-tg-hint text-sm">Нажмите, чтобы загрузить (JPG, PNG)</p>
              </>
            )}
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageUpload}
            />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
           <label className="block text-sm font-medium text-tg-hint">Название</label>
           <input 
             type="text" 
             value={title}
             onChange={(e) => setTitle(e.target.value)}
             placeholder="Например: @username или Digital Art #1"
             className="w-full bg-tg-card border border-transparent focus:border-blue-500 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none transition-all"
           />
        </div>

        {/* AI Generator Section */}
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-tg-hint">Описание</label>
                <button 
                    type="button"
                    onClick={handleAIAutoFill}
                    disabled={!image || isGenerating}
                    className={`text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors ${(!image || isGenerating) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <Sparkles className="w-3 h-3" />
                    {isGenerating ? 'Gemini думает...' : 'Сгенерировать с Gemini'}
                </button>
            </div>
            <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Расскажите о вашем NFT..."
                className="w-full bg-tg-card border border-transparent focus:border-blue-500 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none transition-all resize-none"
            />
        </div>

        {/* Price */}
        <div className="space-y-2">
           <label className="block text-sm font-medium text-tg-hint">Цена (TON)</label>
           <input 
             type="number" 
             value={price}
             onChange={(e) => setPrice(e.target.value)}
             placeholder="0.00"
             step="0.1"
             min="0"
             className="w-full bg-tg-card border border-transparent focus:border-blue-500 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none transition-all"
           />
        </div>

        <div className="pt-4">
            <Button 
                type="submit" 
                className="w-full py-4 text-lg"
                disabled={!title || !price || !image}
            >
                Опубликовать
            </Button>
        </div>

      </form>
    </div>
  );
};

export default CreateListing;