'use client';

import Image from 'next/image';
import { X, Loader2, CheckCircle2, ImagePlus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { UploadDropzone } from '@/lib/uploadthing';

const MAX_IMAGES = 6;

interface ImageUploadProps {
    value: string[];
    onChange: (value: string[]) => void;
    onRemove: (value: string) => void;
}

export function ImageUpload({ value, onChange, onRemove }: ImageUploadProps) {
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadDone, setUploadDone] = useState(false);

    const hasImages = value.length > 0;
    const remainingSlots = Math.max(0, MAX_IMAGES - value.length);
    const isLimitReached = remainingSlots === 0;

    return (
        <div className="space-y-4">
            {/* معرض الصور */}
            {hasImages && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {value.map((imageUrl, index) => (
                        <div key={imageUrl} className="relative h-40 overflow-hidden rounded-xl border border-border/60 bg-muted/20 shadow-sm group">
                            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-2 text-xs text-white">
                                <span className="font-medium">{index === 0 ? 'الصورة الرئيسية' : `صورة ${index + 1}`}</span>
                                <Button
                                    type="button"
                                    onClick={() => onRemove(imageUrl)}
                                    variant="destructive"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                            <Image
                                fill
                                className="object-cover transition-transform group-hover:scale-105"
                                alt={`Menu image ${index + 1}`}
                                src={imageUrl}
                                sizes="(max-width: 768px) 50vw, 25vw"
                            />
                        </div>
                    ))}
                </div>
            )}

            {isLimitReached ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground text-center">
                    تم الوصول إلى الحد الأقصى ({MAX_IMAGES} صور). احذف صورة لإضافة أخرى.
                </div>
            ) : (
                <div className="relative">
                    {/* overlay أثناء الرفع */}
                    {isUploading && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-xl border border-primary/40 bg-background/80 backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-sm font-medium text-primary">جارٍ رفع الصورة...</p>
                                <p className="text-xs text-muted-foreground">يرجى الانتظار</p>
                            </div>
                        </div>
                    )}

                    {/* overlay نجاح الرفع */}
                    {uploadDone && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-xl border border-green-400/40 bg-green-50/80 backdrop-blur-sm dark:bg-green-950/50">
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                            <p className="text-sm font-medium text-green-700 dark:text-green-400">تم رفع الصورة بنجاح!</p>
                        </div>
                    )}

                    <UploadDropzone
                        endpoint="imageUploader"
                        disabled={isLimitReached || isUploading}
                        onBeforeUploadBegin={(files) => files.slice(0, remainingSlots)}
                        onUploadBegin={() => {
                            setIsUploading(true);
                            setUploadDone(false);
                        }}
                        onClientUploadComplete={(res) => {
                            const uploadedUrls = res?.map((file) => file.url).filter(Boolean) ?? [];
                            if (uploadedUrls.length > 0) {
                                const nextImages = Array.from(new Set([...value, ...uploadedUrls])).slice(0, MAX_IMAGES);
                                onChange(nextImages);
                            }
                            setIsUploading(false);
                            setUploadDone(true);
                            // إخفاء تأثير النجاح بعد ثانيتين
                            setTimeout(() => setUploadDone(false), 2000);
                            toast({ title: 'تم رفع الصور بنجاح ✓' });
                        }}
                        onUploadError={(error: Error & { cause?: unknown; data?: unknown }) => {
                            setIsUploading(false);
                            setUploadDone(false);

                            const causeMessage = error.cause instanceof Error
                                ? error.cause.message
                                : typeof error.cause === 'string'
                                    ? error.cause
                                    : null;
                            const details = causeMessage || error.message || 'حدث خطأ غير متوقع أثناء الرفع';

                            console.error('UploadThing client error:', { message: error.message, cause: error.cause, data: error.data });

                            toast({
                                title: 'فشل رفع الصور',
                                description: details,
                                variant: 'destructive',
                            });
                        }}
                        config={{ mode: 'auto' }}
                        content={{
                            label: (
                                <span className="flex items-center gap-2">
                                    <ImagePlus className="h-4 w-4" />
                                    اختر حتى {remainingSlots} صورة أو اسحبها هنا
                                </span>
                            ),
                            allowedContent: `الحد الأقصى ${MAX_IMAGES} صور · كل صورة حتى 4MB`,
                            button: isUploading ? 'جارٍ الرفع...' : 'رفع الصور',
                        }}
                        className="ut-label:text-primary ut-button:bg-primary ut-button:ut-readying:bg-primary/50 ut-upload-icon:text-primary/60 rounded-xl border-border/60"
                    />
                </div>
            )}
        </div>
    );
}
