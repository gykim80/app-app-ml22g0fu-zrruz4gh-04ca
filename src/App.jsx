import { useState, useEffect, useCallback } from 'react';
import { Heart, X, Upload, Trash2, ZoomIn } from 'lucide-react';
import { db } from './lib/davinci-db';
import { cn } from './lib/utils';

// 기본 이미지 데이터
const DEFAULT_IMAGES = [
  { id: '1', url: '/assets/asset.png', title: '갤러리 이미지 1', description: '아름다운 작품', likes: 0, isDefault: true },
  { id: '2', url: '/assets/asset_1.png', title: '갤러리 이미지 2', description: '멋진 풍경', likes: 0, isDefault: true },
  { id: '3', url: '/assets/asset_2.png', title: '갤러리 이미지 3', description: '예술적 순간', likes: 0, isDefault: true },
  { id: '4', url: '/assets/asset_3.png', title: '갤러리 이미지 4', description: '감동적인 장면', likes: 0, isDefault: true },
  { id: '5', url: '/assets/asset_4.png', title: '갤러리 이미지 5', description: '특별한 기억', likes: 0, isDefault: true },
];

function App() {
  const [images, setImages] = useState(DEFAULT_IMAGES);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [likedImages, setLikedImages] = useState(new Set());

  // DB 사용 불가능할 때 로컬 스토리지 사용
  const isDbAvailable = db.isConfigured;

  // 이미지 로드
  useEffect(() => {
    if (isDbAvailable) {
      loadImages();
    } else {
      // 로컬 스토리지에서 로드
      const saved = localStorage.getItem('gallery-images');
      const savedLikes = localStorage.getItem('gallery-likes');
      if (saved) {
        setImages(JSON.parse(saved));
      }
      if (savedLikes) {
        setLikedImages(new Set(JSON.parse(savedLikes)));
      }
    }
  }, [isDbAvailable]);

  const loadImages = useCallback(async () => {
    try {
      const { data } = await db.collection('images').find({}, {
        orderBy: 'uploadedAt',
        orderDirection: 'desc'
      });
      
      if (data && data.length > 0) {
        setImages(data);
      } else {
        // DB가 비어있으면 기본 이미지로 초기화
        await db.collection('images').addMany(
          DEFAULT_IMAGES.map(img => ({
            ...img,
            uploadedAt: Date.now()
          }))
        );
        setImages(DEFAULT_IMAGES);
      }
    } catch (error) {
      console.error('이미지 로드 실패:', error);
    }
  }, []);

  // 파일 업로드 핸들러
  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    const reader = new FileReader();
    
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        setUploadProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    reader.onload = async (e) => {
      const imageUrl = e.target?.result;
      const newImage = {
        id: Date.now().toString(),
        url: imageUrl,
        title: file.name.replace(/\.[^/.]+$/, ''),
        description: '업로드된 이미지',
        likes: 0,
        uploadedAt: Date.now(),
        isDefault: false
      };

      if (isDbAvailable) {
        try {
          await db.collection('images').add(newImage);
          await loadImages();
        } catch (error) {
          console.error('이미지 저장 실패:', error);
        }
      } else {
        setImages(prev => {
          const updated = [newImage, ...prev];
          localStorage.setItem('gallery-images', JSON.stringify(updated));
          return updated;
        });
      }

      setIsUploading(false);
      setUploadProgress(0);
    };

    reader.readAsDataURL(file);
  }, [isDbAvailable, loadImages]);

  // 좋아요 토글
  const toggleLike = useCallback(async (imageId, e) => {
    e.stopPropagation();
    
    const isLiked = likedImages.has(imageId);
    const newLikedImages = new Set(likedImages);
    
    if (isLiked) {
      newLikedImages.delete(imageId);
    } else {
      newLikedImages.add(imageId);
    }
    
    setLikedImages(newLikedImages);

    if (isDbAvailable) {
      try {
        const image = images.find(img => img.id === imageId);
        await db.collection('images').updateById(imageId, {
          likes: isLiked ? image.likes - 1 : image.likes + 1
        });
        await loadImages();
      } catch (error) {
        console.error('좋아요 업데이트 실패:', error);
      }
    } else {
      setImages(prev => {
        const updated = prev.map(img => 
          img.id === imageId 
            ? { ...img, likes: isLiked ? img.likes - 1 : img.likes + 1 }
            : img
        );
        localStorage.setItem('gallery-images', JSON.stringify(updated));
        localStorage.setItem('gallery-likes', JSON.stringify([...newLikedImages]));
        return updated;
      });
    }
  }, [likedImages, isDbAvailable, images, loadImages]);

  // 이미지 삭제
  const deleteImage = useCallback(async (imageId, e) => {
    e.stopPropagation();
    
    const image = images.find(img => img.id === imageId);
    if (image?.isDefault) return;

    if (isDbAvailable) {
      try {
        await db.collection('images').deleteById(imageId);
        await loadImages();
      } catch (error) {
        console.error('이미지 삭제 실패:', error);
      }
    } else {
      setImages(prev => {
        const updated = prev.filter(img => img.id !== imageId);
        localStorage.setItem('gallery-images', JSON.stringify(updated));
        return updated;
      });
    }
  }, [isDbAvailable, images, loadImages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a]">
      {/* 헤더 */}
      <header className="bg-[#1a1a1a]/80 backdrop-blur-lg border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#f5f5f5]">이미지 갤러리</h1>
              <p className="text-sm text-[#f5f5f5]/60 mt-1">아름다운 순간들을 담다</p>
            </div>
            
            {/* 업로드 버튼 */}
            <label className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 cursor-pointer",
              "bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white",
              "shadow-lg shadow-[#3b82f6]/20 hover:shadow-xl hover:shadow-[#3b82f6]/30",
              "hover:scale-105 active:scale-95",
              isUploading && "opacity-50 cursor-not-allowed"
            )}>
              <Upload className="w-5 h-5" />
              <span>{isUploading ? `업로드 중 ${uploadProgress}%` : '이미지 업로드'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          </div>

          {!isDbAvailable && (
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-yellow-200/80">
                🚀 배포하면 데이터베이스 기능이 활성화됩니다! 현재는 로컬 스토리지를 사용합니다.
              </p>
            </div>
          )}
        </div>
      </header>

      {/* 갤러리 그리드 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((image, index) => (
            <div
              key={image.id}
              onClick={() => setSelectedImage(image)}
              className={cn(
                "group relative rounded-2xl overflow-hidden cursor-pointer",
                "bg-[#1a1a1a]/50 backdrop-blur-sm border border-white/10",
                "transition-all duration-500 hover:scale-105",
                "shadow-lg hover:shadow-2xl hover:shadow-[#3b82f6]/20",
                "animate-in fade-in slide-in-from-bottom-4"
              )}
              style={{
                animationDelay: `${index * 50}ms`,
                animationFillMode: 'backwards'
              }}
            >
              {/* 이미지 */}
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src={image.url}
                  alt={image.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>

              {/* 오버레이 */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent",
                "opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              )}>
                <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="text-xl font-bold text-white mb-2">{image.title}</h3>
                  <p className="text-sm text-white/70 mb-4">{image.description}</p>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => toggleLike(image.id, e)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300",
                        likedImages.has(image.id)
                          ? "bg-red-500 text-white"
                          : "bg-white/10 text-white hover:bg-white/20"
                      )}
                    >
                      <Heart 
                        className={cn(
                          "w-4 h-4 transition-all duration-300",
                          likedImages.has(image.id) && "fill-current"
                        )}
                      />
                      <span className="text-sm font-medium">{image.likes}</span>
                    </button>

                    <button
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all duration-300"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>

                    {!image.isDefault && (
                      <button
                        onClick={(e) => deleteImage(image.id, e)}
                        className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all duration-300 ml-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 좋아요 뱃지 */}
              {image.likes > 0 && (
                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-red-500/90 backdrop-blur-sm flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-white fill-current" />
                  <span className="text-sm font-medium text-white">{image.likes}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {images.length === 0 && (
          <div className="text-center py-20">
            <Upload className="w-16 h-16 text-[#f5f5f5]/30 mx-auto mb-4" />
            <p className="text-[#f5f5f5]/60 text-lg">아직 이미지가 없습니다</p>
            <p className="text-[#f5f5f5]/40 text-sm mt-2">첫 이미지를 업로드해보세요!</p>
          </div>
        )}
      </main>

      {/* 이미지 모달 */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300"
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-300 hover:rotate-90"
          >
            <X className="w-6 h-6" />
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-5xl w-full animate-in zoom-in-95 duration-300"
          >
            <img
              src={selectedImage.url}
              alt={selectedImage.title}
              className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
            
            <div className="mt-6 text-center">
              <h2 className="text-2xl font-bold text-white mb-2">{selectedImage.title}</h2>
              <p className="text-white/70">{selectedImage.description}</p>
              
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={(e) => toggleLike(selectedImage.id, e)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300",
                    likedImages.has(selectedImage.id)
                      ? "bg-red-500 text-white"
                      : "bg-white/10 text-white hover:bg-white/20"
                  )}
                >
                  <Heart 
                    className={cn(
                      "w-5 h-5 transition-all duration-300",
                      likedImages.has(selectedImage.id) && "fill-current"
                    )}
                  />
                  <span className="font-medium">{selectedImage.likes} 좋아요</span>
                </button>

                {!selectedImage.isDefault && (
                  <button
                    onClick={(e) => {
                      deleteImage(selectedImage.id, e);
                      setSelectedImage(null);
                    }}
                    className="px-6 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all duration-300 flex items-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="font-medium">삭제</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;