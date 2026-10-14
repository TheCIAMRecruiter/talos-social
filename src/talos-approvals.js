// TALOS browser-side approval API adapter.
// Requires Supabase JS v2 to be loaded by the app and a configured authenticated client.
// Does not send email or publish posts. All review transitions occur in Supabase RPC.
export function createTalosApprovals(supabase) {
  if (!supabase) throw new Error('Supabase client required');
  return {
    async pending(workspaceId) {
      const {data,error} = await supabase.from('talos_posts')
        .select('id,workspace_id,author_id,reviewer_id,topic,draft_text,status,created_at')
        .eq('workspace_id',workspaceId).eq('status','PENDING_APPROVAL')
        .order('created_at',{ascending:false});
      if (error) throw error;
      return data;
    },
    async get(postId) {
      const {data,error} = await supabase.from('talos_posts')
        .select('id,workspace_id,author_id,reviewer_id,topic,draft_text,status,created_at')
        .eq('id',postId).single();
      if (error) throw error;
      return data;
    },
    async review(postId, action, editedText = null) {
      if (!['approve','rewrite','reject','edit'].includes(action)) throw new Error('Invalid action');
      const {data,error} = await supabase.rpc('talos_review_post',{
        p_post_id:postId,p_action:action,p_edited_text:editedText
      });
      if (error) throw error;
      return data;
    }
  };
}
