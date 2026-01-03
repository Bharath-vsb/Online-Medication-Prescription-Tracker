import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { drugName } = await req.json();
    
    if (!drugName) {
      return new Response(
        JSON.stringify({ error: 'Drug name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Fetching drug information for: ${drugName}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a pharmaceutical information assistant. Provide accurate, detailed drug information in JSON format. Always include safety warnings and recommend consulting healthcare professionals. Return ONLY valid JSON without markdown formatting.`
          },
          {
            role: 'user',
            content: `Provide detailed pharmaceutical information for "${drugName}" in the following JSON structure:
{
  "name": "drug name",
  "genericName": "generic name if applicable",
  "drugClass": "classification",
  "composition": "active ingredients and their amounts",
  "usage": ["list of medical uses"],
  "dosage": "typical dosage information",
  "sideEffects": ["list of common side effects"],
  "warnings": ["important warnings"],
  "interactions": ["drug interactions to be aware of"],
  "contraindications": ["conditions where drug should not be used"],
  "storage": "storage instructions",
  "manufacturer": "common manufacturers if known"
}`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Service temporarily unavailable.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error('Failed to fetch drug information');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse the JSON response, handling potential markdown code blocks
    let drugInfo;
    try {
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      drugInfo = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid drug information format');
    }

    console.log(`Successfully fetched drug info for: ${drugName}`);

    return new Response(
      JSON.stringify({ drugInfo }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Drug info error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});