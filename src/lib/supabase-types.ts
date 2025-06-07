export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      Address: {
        Row: {
          city: string | null
          confidence_score: number | null
          county: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          normalized_address: string
          original_address: string
          state: string | null
          street_name: string | null
          street_number: string | null
          unit_number: string | null
          zip_code: string | null
          zip_plus_four: string | null
        }
        Insert: {
          city?: string | null
          confidence_score?: number | null
          county?: string | null
          created_at?: string
          id: string
          latitude?: number | null
          longitude?: number | null
          normalized_address: string
          original_address: string
          state?: string | null
          street_name?: string | null
          street_number?: string | null
          unit_number?: string | null
          zip_code?: string | null
          zip_plus_four?: string | null
        }
        Update: {
          city?: string | null
          confidence_score?: number | null
          county?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          normalized_address?: string
          original_address?: string
          state?: string | null
          street_name?: string | null
          street_number?: string | null
          unit_number?: string | null
          zip_code?: string | null
          zip_plus_four?: string | null
        }
        Relationships: []
      }
      ComparableSale: {
        Row: {
          address: string
          cap_rate: number | null
          city: string
          confidence_score: number | null
          created_at: string
          days_on_market: number | null
          id: string
          listing_price: number | null
          price_per_sqft: number | null
          price_per_unit: number | null
          price_reduction: number | null
          property_id: string | null
          property_type: string
          sale_date: string
          sale_price: number
          sale_property_id: string | null
          sq_ft: number | null
          state: string
          transaction_source: string
          units: number | null
          updated_at: string
          year_built: number | null
          zip_code: string
        }
        Insert: {
          address: string
          cap_rate?: number | null
          city: string
          confidence_score?: number | null
          created_at?: string
          days_on_market?: number | null
          id: string
          listing_price?: number | null
          price_per_sqft?: number | null
          price_per_unit?: number | null
          price_reduction?: number | null
          property_id?: string | null
          property_type: string
          sale_date: string
          sale_price: number
          sale_property_id?: string | null
          sq_ft?: number | null
          state: string
          transaction_source: string
          units?: number | null
          updated_at: string
          year_built?: number | null
          zip_code: string
        }
        Update: {
          address?: string
          cap_rate?: number | null
          city?: string
          confidence_score?: number | null
          created_at?: string
          days_on_market?: number | null
          id?: string
          listing_price?: number | null
          price_per_sqft?: number | null
          price_per_unit?: number | null
          price_reduction?: number | null
          property_id?: string | null
          property_type?: string
          sale_date?: string
          sale_price?: number
          sale_property_id?: string | null
          sq_ft?: number | null
          state?: string
          transaction_source?: string
          units?: number | null
          updated_at?: string
          year_built?: number | null
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "ComparableSale_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "Property"
            referencedColumns: ["id"]
          },
        ]
      }
      Property: {
        Row: {
          address: string
          asking_cap_rate: number | null
          city: string
          county: string | null
          created_at: string
          description: string | null
          features: string | null
          gross_income: number | null
          id: string
          images: string | null
          last_tax_update: string | null
          latitude: number | null
          listing_price: number | null
          listing_source: string | null
          listing_url: string | null
          longitude: number | null
          lot_size: number | null
          lot_size_sq_ft: number | null
          noi: number | null
          parcel_id: string | null
          property_sub_type: string | null
          property_subtype: string | null
          property_type: string | null
          sq_ft: number | null
          sqft: number | null
          state: string
          street_name: string | null
          street_number: string | null
          tax_assessor_url: string | null
          units: number | null
          updated_at: string
          year_built: number | null
          zip_code: string
        }
        Insert: {
          address: string
          asking_cap_rate?: number | null
          city: string
          county?: string | null
          created_at?: string
          description?: string | null
          features?: string | null
          gross_income?: number | null
          id: string
          images?: string | null
          last_tax_update?: string | null
          latitude?: number | null
          listing_price?: number | null
          listing_source?: string | null
          listing_url?: string | null
          longitude?: number | null
          lot_size?: number | null
          lot_size_sq_ft?: number | null
          noi?: number | null
          parcel_id?: string | null
          property_sub_type?: string | null
          property_subtype?: string | null
          property_type?: string | null
          sq_ft?: number | null
          sqft?: number | null
          state: string
          street_name?: string | null
          street_number?: string | null
          tax_assessor_url?: string | null
          units?: number | null
          updated_at: string
          year_built?: number | null
          zip_code: string
        }
        Update: {
          address?: string
          asking_cap_rate?: number | null
          city?: string
          county?: string | null
          created_at?: string
          description?: string | null
          features?: string | null
          gross_income?: number | null
          id?: string
          images?: string | null
          last_tax_update?: string | null
          latitude?: number | null
          listing_price?: number | null
          listing_source?: string | null
          listing_url?: string | null
          longitude?: number | null
          lot_size?: number | null
          lot_size_sq_ft?: number | null
          noi?: number | null
          parcel_id?: string | null
          property_sub_type?: string | null
          property_subtype?: string | null
          property_type?: string | null
          sq_ft?: number | null
          sqft?: number | null
          state?: string
          street_name?: string | null
          street_number?: string | null
          tax_assessor_url?: string | null
          units?: number | null
          updated_at?: string
          year_built?: number | null
          zip_code?: string
        }
        Relationships: []
      }
      // ... (truncated for brevity, but includes all other tables)
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']