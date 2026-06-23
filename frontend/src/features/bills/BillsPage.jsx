import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ElectricityForm from "./ElectricityForm";
import TvForm from "./TvForm";

export default function BillsPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Pay Bills</h1>
        <p className="text-muted-foreground">Electricity tokens and TV subscriptions.</p>
      </div>

      <Tabs defaultValue="electricity">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="electricity">Electricity</TabsTrigger>
          <TabsTrigger value="tv">TV Subscription</TabsTrigger>
        </TabsList>
        <TabsContent value="electricity">
          <ElectricityForm />
        </TabsContent>
        <TabsContent value="tv">
          <TvForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
