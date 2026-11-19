window.thefoxSupabase = window.supabase.createClient(
  "https://wphjuschupdevhaswuzy.supabase.co",
  "sb_publishable_DF8Zfi22tf1vKUFVk9I3tw_atUDcTGp"
);

window.thefoxCloud = {
  async getMenu() {
    const { data, error } = await window.thefoxSupabase
      .from("menu_items")
      .select("*")
      .order("position", { ascending: true });

    if (error) throw error;
    return (data || []).map((item) => ({
      id: item.id,
      category: item.category,
      name: item.name,
      description: item.description || "",
      price: Number(item.price),
      featured: Boolean(item.featured),
    }));
  },

  async saveMenu(menu) {
    const rows = menu.map((item, position) => ({
      id: item.id,
      category: item.category,
      name: item.name,
      description: item.description || "",
      price: Number(item.price),
      featured: Boolean(item.featured),
      position,
    }));

    await window.thefoxSupabase.from("menu_items").delete().neq("id", "");

    const { error } = await window.thefoxSupabase.from("menu_items").insert(rows);
    if (error) throw error;
  },

  async getOrders() {
    const { data, error } = await window.thefoxSupabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map((order) => ({
      id: order.id,
      createdAt: order.created_at,
      status: order.status,
      items: order.items || [],
      total: Number(order.total),
      customer: {
        name: order.customer_name,
        phone: order.customer_phone,
        address: order.customer_address,
        notes: order.customer_notes || "",
      },
    }));
  },

  async createOrder(order) {
    const { data, error } = await window.thefoxSupabase
      .from("orders")
      .insert({
        id: order.id,
        created_at: order.createdAt,
        status: order.status,
        items: order.items,
        total: order.total,
        customer_name: order.customer.name,
        customer_phone: order.customer.phone,
        customer_address: order.customer.address,
        customer_notes: order.customer.notes,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateOrderStatus(orderId, status) {
    const { error } = await window.thefoxSupabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    if (error) throw error;
  },

  async getReservations() {
    const { data, error } = await window.thefoxSupabase
      .from("reservations")
      .select("*")
      .order("reservation_date", { ascending: true })
      .order("reservation_time", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createReservation(reservation) {
    const { data, error } = await window.thefoxSupabase
      .from("reservations")
      .insert(reservation)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateReservationStatus(id, status) {
    const { error } = await window.thefoxSupabase
      .from("reservations")
      .update({ status })
      .eq("id", id);

    if (error) throw error;
  },

  async getEventInquiries() {
    const { data, error } = await window.thefoxSupabase
      .from("event_inquiries")
      .select("*")
      .order("event_date", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createEventInquiry(inquiry) {
    const { data, error } = await window.thefoxSupabase
      .from("event_inquiries")
      .insert(inquiry)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  subscribe(table, callback) {
    return window.thefoxSupabase
      .channel(`thefox-${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, callback)
      .subscribe();
  },
};
