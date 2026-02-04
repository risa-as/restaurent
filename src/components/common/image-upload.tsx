'use client';

import { UploadDropzone } from "@/lib/uploadthing";
import { X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
    value: string;
    onChange: (value: string) => void;
    onRemove: (value: string) => void;
}

export function ImageUpload({ value, onChange, onRemove }: ImageUploadProps) {
    const { toast } = useToast();

    if (value) {
        return (
            <div className="relative w-full h-48 rounded-md overflow-hidden border">
                <div className="absolute top-2 right-2 z-10">
                    <Button type="button" onClick={() => onRemove(value)} variant="destructive" size="icon" className="h-6 w-6">
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                <Image
                    fill
                    className="object-cover"
                    alt="Image"
                    src={value}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
            </div>
        );
    }

    return (
        <UploadDropzone
            endpoint="imageUploader"
            onClientUploadComplete={(res) => {
                // Do something with the response
                if (res?.[0]) {
                    onChange(res[0].url);
                    toast({
                        title: "تم رفع الصورة بنجاح",
                    });
                }
            }}
            onUploadError={(error: Error) => {
                // Do something with the error.
                toast({
                    title: "فشل رفع الصورة",
                    description: error.message,
                    variant: "destructive",
                });
            }}
            config={{
                mode: "auto"
            }}
            className="ut-label:text-primary ut-button:bg-primary ut-button:ut-readying:bg-primary/50"
        />
    );
}
