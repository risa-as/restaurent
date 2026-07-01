"use client";

import { Branch } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteUser, upsertUser, UserInput } from "@/lib/actions/admin";
import { Edit, Trash2, Plus, Users } from "lucide-react";
import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/ui/empty-state";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "مسؤول",
  MANAGER: "مدير",
  WAITER: "نادل",
  CHEF: "طاهي",
  DRIVER: "سائق",
  CAPTAIN: "كابتن",
  CASHIER: "أمين صندوق",
  DELIVERY_MANAGER: "مدير سائقين",
  ACCOUNTANT: "محاسب",
};

const schema = z.object({
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().optional(),
  role: z.enum([
    "ADMIN",
    "MANAGER",
    "WAITER",
    "CHEF",
    "ACCOUNTANT",
    "DRIVER",
    "CAPTAIN",
    "DELIVERY_MANAGER",
    "CASHIER",
  ]),
  phone: z.string().optional(),
  branchId: z.string().nullish(),
});

type UserWithBranch = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  branchId: string | null;
  branch: { id: string; name: string } | null;
  createdAt: Date;
};

interface UserManagementProps {
  users: UserWithBranch[];
  branches: Branch[];
  selectedBranchId: string | null;
  isAdmin: boolean;
}

export function UserManagement({
  users,
  branches,
  selectedBranchId,
  isAdmin,
}: UserManagementProps) {
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithBranch | null>(null);
  const showBranch = branches.length > 1;

  const handleEdit = (user: UserWithBranch) => {
    setEditingUser(user);
    setOpen(true);
  };

  const handleAdd = () => {
    setEditingUser(null);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {users.length} موظف مسجّل
        </p>
        <Button onClick={handleAdd}>
          <Plus className="ml-2 h-4 w-4" /> إضافة موظف
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "تعديل الموظف" : "موظف جديد"}
            </DialogTitle>
          </DialogHeader>
          <UserForm
            user={editingUser}
            branches={branches}
            defaultBranchId={selectedBranchId}
            isAdmin={isAdmin}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="لا يوجد موظفون"
          description="ابدأ بإضافة موظفين لفريق عملك"
        />
      ) : (
        <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">الدور</TableHead>
                {showBranch && (
                  <TableHead className="text-right">الفرع</TableHead>
                )}
                <TableHead className="text-right">البريد الإلكتروني</TableHead>
                <TableHead className="text-left w-[100px]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user, idx) => (
                <TableRow
                  key={user.id}
                  className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}
                >
                  <TableCell className="font-medium text-right">
                    {user.name}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">
                      {ROLE_LABELS[user.role] ?? user.role}
                    </Badge>
                  </TableCell>
                  {showBranch && (
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="text-xs">
                        {user.branch?.name ?? "كل الفروع"}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell className="text-right text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell className="text-left">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEdit(user)}
                      >
                        <Edit className="h-3.5 w-3.5 text-primary" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف الموظف</AlertDialogTitle>
                            <AlertDialogDescription>
                              هل أنت متأكد من حذف <strong>{user.name}</strong>؟
                              لا يمكن التراجع عن هذا الإجراء.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                await deleteUser(user.id);
                              }}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      )}

    </div>
  );
}

function UserForm({
  user,
  branches,
  defaultBranchId,
  isAdmin,
  onSuccess,
}: {
  user: UserWithBranch | null;
  branches: Branch[];
  defaultBranchId: string | null;
  isAdmin: boolean;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const showBranch = branches.length > 1;

  const form = useForm<UserInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      role: (user?.role as UserInput["role"]) ?? "WAITER",
      phone: user?.phone ?? "",
      password: "",
      branchId: user?.branchId ?? defaultBranchId ?? null,
    },
  });

  const onSubmit = (data: UserInput) => {
    startTransition(async () => {
      const res = await upsertUser(data, user?.id);
      if (res.success) {
        toast({ title: user ? "تم تحديث الموظف" : "تم إضافة الموظف بنجاح" });
        onSuccess();
      } else {
        toast({
          title: "فشل الحفظ",
          description: res.error,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>الاسم</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>البريد الإلكتروني</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الدور</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر دوراً" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="MANAGER">مدير</SelectItem>
                    <SelectItem value="WAITER">نادل</SelectItem>
                    <SelectItem value="CHEF">طاهي</SelectItem>
                    <SelectItem value="DRIVER">سائق</SelectItem>
                    <SelectItem value="CAPTAIN">كابتن</SelectItem>
                    <SelectItem value="CASHIER">أمين صندوق</SelectItem>
                    <SelectItem value="DELIVERY_MANAGER">
                      مدير سائقين
                    </SelectItem>
                    <SelectItem value="ACCOUNTANT">محاسب</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>رقم الهاتف (اختياري)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {showBranch && (
          <FormField
            control={form.control}
            name="branchId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الفرع</FormLabel>
                <Select
                  onValueChange={(val) =>
                    field.onChange(val === "__all__" ? null : val)
                  }
                  defaultValue={field.value ?? "__all__"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الفرع" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isAdmin && (
                      <SelectItem value="__all__">كل الفروع</SelectItem>
                    )}
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                        {b.isMainBranch ? " (رئيسي)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {user ? "كلمة المرور الجديدة (اختياري)" : "كلمة المرور"}
              </FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder={
                    user ? "اترك الحقل فارغاً للاحتفاظ بالحالية" : "••••••"
                  }
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "جاري الحفظ..." : user ? "تحديث الموظف" : "إضافة الموظف"}
        </Button>
      </form>
    </Form>
  );
}
